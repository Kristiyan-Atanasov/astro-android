// services/api.js
import * as SecureStore from 'expo-secure-store';
import { notifySessionExpired } from './sessionEvents';
import { setReadProgressUser } from './readProgress';

export const API_BASE = 'https://yrfz6x9dl1.execute-api.eu-central-1.amazonaws.com/dev';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const DAILY_VIBE_CACHE_KEY = 'dailyVibeCache';

// Returns the user's local calendar day as a YYYY-MM-DD string. We use the
// local date (rather than UTC) so the vibe rolls over at the user's own
// midnight rather than at a server timezone they don't see.
function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function readDailyVibeCache() {
  try {
    const raw = await SecureStore.getItemAsync(DAILY_VIBE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeDailyVibeCache(entry) {
  try {
    await SecureStore.setItemAsync(DAILY_VIBE_CACHE_KEY, JSON.stringify(entry));
  } catch (e) {
    console.log(
      '🌐 daily_vibe cache write failed:',
      e?.message ?? String(e),
    );
  }
}

export async function clearDailyVibeCache() {
  try {
    await SecureStore.deleteItemAsync(DAILY_VIBE_CACHE_KEY);
  } catch {
    // ignore
  }
}

let cachedAccessToken = null;
let cachedAccessTokenPromise = null;
let cachedRefreshToken = null;
let inFlightRefresh = null;

// Called by every 401/403 path. Clears the stored token and pings the
// global session-expiry listener (registered in app/_layout.tsx) so we
// surface a single user-facing message instead of silently bouncing
// the user back to the welcome screen.
async function handleSessionExpired() {
  await clearAccessToken();
  notifySessionExpired();
}

export async function setAccessToken(token) {
  if (!token || typeof token !== 'string') return;
  cachedAccessToken = token;
  cachedAccessTokenPromise = null;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken() {
  if (cachedAccessToken) return cachedAccessToken;
  if (cachedAccessTokenPromise) return cachedAccessTokenPromise;
  cachedAccessTokenPromise = (async () => {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      cachedAccessToken = token || null;
      return cachedAccessToken;
    } finally {
      cachedAccessTokenPromise = null;
    }
  })();
  return cachedAccessTokenPromise;
}

export function getCachedAccessToken() {
  return cachedAccessToken;
}

export async function clearAccessToken() {
  cachedAccessToken = null;
  cachedAccessTokenPromise = null;
  cachedRefreshToken = null;
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  // Drop the cached daily vibe so a different account signing in next
  // doesn't inherit the previous user's vibe text.
  await clearDailyVibeCache();
  // Keep per-user reading progress so logging back in restores it; just
  // detach the active-user pointer for now.
  await setReadProgressUser(null);
}

// Persist a refresh token returned from /authentication/social_login/.
// Stored alongside the access token so we can call /authentication/refresh/
// silently when the access token expires.
export async function setRefreshToken(token) {
  if (!token || typeof token !== 'string') {
    cachedRefreshToken = null;
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    return;
  }
  cachedRefreshToken = token;
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken() {
  if (cachedRefreshToken) return cachedRefreshToken;
  try {
    const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    cachedRefreshToken = token || null;
    return cachedRefreshToken;
  } catch {
    return null;
  }
}

// Backend contract:
//   POST /authentication/social_login/
//   { "provider": "google" | "apple" | "facebook", "id_token": "..." }
//   -> { "access": "...", "refresh": "..." }
//
// We always send the provider's token in the `id_token` field per the
// backend's API guide. For Google and Apple this is the OIDC id_token; for
// Facebook the value is whatever Facebook returned (access_token), and the
// backend validates it against the Graph API.
//
// On success this stores both tokens and returns them; the caller is
// responsible for navigating the user.
export async function socialLogin(provider, idToken) {
  if (provider !== 'google' && provider !== 'apple' && provider !== 'facebook') {
    throw new Error(`Unsupported social login provider: ${provider}`);
  }
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing provider token');
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/authentication/social_login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, id_token: idToken }),
    });
  } catch (e) {
    console.log('🌐 social_login network error:', e?.message ?? String(e));
    throw new Error('Network request failed');
  }

  console.log(`🌐 social_login (${provider}) status:`, res.status);

  const { raw, data } = await readResponse(res);

  if (!res.ok) {
    console.log('❌ social_login error body:', raw);
    throw new Error(
      data?.message || data?.detail || raw || `HTTP ${res.status}`
    );
  }

  const access = data?.access || data?.access_token || data?.token || null;
  const refresh = data?.refresh || data?.refresh_token || null;
  if (!access) throw new Error('Backend returned no JWT.');

  await setAccessToken(access);
  if (refresh) await setRefreshToken(refresh);

  return { access, refresh };
}

// Calls /authentication/refresh/ with the stored refresh token and updates
// the cached/stored access token. De-duped so concurrent 401s only fire one
// refresh request. Returns the new access token, or null if refresh failed
// (caller should treat that as a session-expired event).
export async function refreshAccessToken() {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    try {
      const refresh = await getRefreshToken();
      if (!refresh) return null;

      let res;
      try {
        res = await fetch(`${API_BASE}/authentication/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });
      } catch (e) {
        console.log('🌐 refresh network error:', e?.message ?? String(e));
        return null;
      }

      console.log('🌐 refresh status:', res.status);

      if (!res.ok) {
        // 401/403 here means the refresh token itself is dead → force sign-in.
        if (res.status === 401 || res.status === 403) {
          await clearAccessToken();
        }
        return null;
      }

      const { data } = await readResponse(res);
      const access = data?.access || data?.access_token || null;
      if (!access) return null;

      await setAccessToken(access);
      return access;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

function safeJsonFromText(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function readResponse(res) {
  const raw = await res.text(); // consume once; works even if not JSON
  const data = safeJsonFromText(raw);
  return { raw, data };
}

function normalizeQualitiesResponse(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.qualities)) return data.qualities;
  return [];
}

function normalizeArchetypesResponse(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.archetypes)) return data.archetypes;
  return [];
}

function formatApiError(data, raw, fallback) {
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.detail) {
    return typeof data.detail === 'string'
      ? data.detail
      : JSON.stringify(data.detail);
  }
  if (data?.message) return String(data.message);
  if (data?.quality_id != null) {
    const q = data.quality_id;
    if (typeof q === 'string') return q;
    if (Array.isArray(q)) return q.join(', ');
    return JSON.stringify(q);
  }
  if (data && typeof data === 'object') {
    const parts = Object.entries(data).map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
      if (value != null && typeof value === 'object') {
        return `${key}: ${JSON.stringify(value)}`;
      }
      return `${key}: ${value}`;
    });
    if (parts.length) return parts.join('; ');
  }
  return raw || fallback;
}

let recalculateAttemptedThisSession = false;

export async function getUserProfile() {
  const token = await getAccessToken();
  if (!token) return null;

  const requestProfile = (bearer) =>
    fetch(`${API_BASE}/authentication/user_profile/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearer}`,
      },
    });

  let res;
  try {
    res = await requestProfile(token);
  } catch (e) {
    console.log('🌐 user_profile network error:', e?.message ?? String(e));
    return null;
  }

  // The access token likely expired. Silently swap it for a fresh one using
  // the stored refresh token and retry once before giving up — this is what
  // keeps the user signed in across app launches instead of bouncing them
  // back to the welcome screen.
  if (res.status === 401 || res.status === 403) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      try {
        res = await requestProfile(refreshed);
      } catch (e) {
        console.log('🌐 user_profile retry network error:', e?.message ?? String(e));
        return null;
      }
    }
  }

  console.log('🌐 user_profile status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    return null;
  }

  if (!res.ok) return null;

  const { data } = await readResponse(res);
  // Point local reading progress at this account so it's namespaced per user
  // and survives logout/login on the same device. Prefer a stable id, fall
  // back to email if the backend doesn't return one.
  if (data) {
    const userKey = data.id != null ? data.id : data.email;
    if (userKey != null && userKey !== '') {
      setReadProgressUser(userKey).catch(() => {});
    }
  }
  return data || null;
}

export async function patchUserProfile(patch) {
  const token = await getAccessToken();
  if (!token) throw new Error('Missing access token. Please sign in again.');

  let res;
  try {
    res = await fetch(`${API_BASE}/authentication/user_profile/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch ?? {}),
    });
  } catch (e) {
    console.log('🌐 user_profile patch network error:', e?.message ?? String(e));
    throw new Error('Network request failed');
  }

  console.log('🌐 user_profile patch status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    throw new Error('Session expired. Please sign in again.');
  }

  const { raw, data } = await readResponse(res);

  if (!res.ok) {
    throw new Error(
      data?.message ||
        data?.detail ||
        raw ||
        `Profile update failed (${res.status})`
    );
  }

  return data;
}

export async function getUserArchetypes() {
  const token = await getAccessToken();
  if (!token) return null;

  let res;
  try {
    res = await fetch(`${API_BASE}/archetypes/user_archetypes/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (e) {
    console.log('🌐 user_archetypes network error:', e?.message ?? String(e));
    return null;
  }

  console.log('🌐 user_archetypes status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    return null;
  }

  if (!res.ok) return null;

  const { data } = await readResponse(res);
  return data || null;
}

// Starts learning an archetype and seeds UserQualityState rows on the backend.
//   POST /archetypes/user_archetypes/  { archetype: "LEO" }
export async function startUserArchetype(archetype) {
  const token = await getAccessToken();
  if (!token) return false;

  const code = String(archetype || '').toUpperCase();
  if (!code) return false;

  let res;
  try {
    res = await fetch(`${API_BASE}/archetypes/user_archetypes/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ archetype: code }),
    });
  } catch {
    return false;
  }

  await readResponse(res);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    return false;
  }

  return res.ok;
}

// Reads backend-computed completion % for one archetype from user_archetypes.
export async function getArchetypeCompletedPercentage(archetype) {
  const data = await getUserArchetypes();
  if (!data) return null;

  const code = String(archetype || '').toUpperCase();
  const list = normalizeArchetypesResponse(data);
  const match = list.find(
    (a) => String(a?.archetype || '').toUpperCase() === code,
  );
  if (!match) return null;

  const raw =
    match.completed_percentage ??
    match.completion_percentage ??
    match.progress_percentage;
  if (typeof raw !== 'number') return null;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// Fetches users with a similar wheel, used by the "People in common" screen
// (app/community.tsx). Backend groups users per zodiac archetype:
//   {
//     "groups": [
//       {
//         "archetype": "LEO",
//         "users": [
//           {
//             "id": 123,
//             "name": "Maya",
//             "zodiac_sign": "PISCES",      // sun sign (zodiac code)
//             "moon_sign": "TAURUS",
//             "ascendant": "TAURUS",        // rising sign
//             "learning_archetypes": ["LEO", "VIRGO"],
//             "social_acc_facebook": null,
//             "social_acc_instagram": "maya.stars"
//           }
//         ]
//       }
//     ]
//   }
export async function getSimilarUsers() {
  const token = await getAccessToken();
  if (!token) return null;

  let res;
  try {
    res = await fetch(`${API_BASE}/archetypes/similar_users/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (e) {
    console.log('🌐 similar_users network error:', e?.message ?? String(e));
    return null;
  }

  console.log('🌐 similar_users status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    return null;
  }

  const { raw, data } = await readResponse(res);
  // Temporary diagnostic: log the shape so we can see why the list may be
  // empty (empty groups vs. a different payload shape).
  console.log('🌐 similar_users body:', raw ? raw.slice(0, 600) : '(empty)');

  if (!res.ok) return null;

  return data || null;
}

export async function recalculateAstro() {
  const token = await getAccessToken();
  if (!token) return false;

  let res;
  try {
    res = await fetch(`${API_BASE}/archetypes/astro/recalculate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return false;
  }

  await readResponse(res);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    return false;
  }

  return res.ok;
}

export async function getUserQualities(options = {}) {
  const { attemptSeed = false } = options;
  const token = await getAccessToken();
  if (!token) return null;

  let res;
  try {
    res = await fetch(`${API_BASE}/archetypes/user_qualities/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (e) {
    console.log('🌐 user_qualities network error:', e?.message ?? String(e));
    return null;
  }

  console.log('🌐 user_qualities status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    return null;
  }

  if (!res.ok) return null;

  const { data } = await readResponse(res);
  const qualities = normalizeQualitiesResponse(data);

  if (
    qualities.length === 0 &&
    attemptSeed &&
    !recalculateAttemptedThisSession
  ) {
    recalculateAttemptedThisSession = true;
    const seeded = await recalculateAstro();
    if (seeded) {
      return getUserQualities({ attemptSeed: false });
    }
  }

  return qualities;
}

// Returns the full catalog of qualities for a given archetype from
// /archetypes/archetype_qualities/?archetype=CODE. Unlike user_qualities this
// is not personalized, so it's always populated for a valid archetype even
// before the user has started learning it.
export async function getArchetypeQualities(archetype) {
  const token = await getAccessToken();
  if (!token) return null;

  const code = String(archetype || '').toUpperCase();
  if (!code) return [];

  let res;
  try {
    res = await fetch(
      `${API_BASE}/archetypes/archetype_qualities/?archetype=${encodeURIComponent(code)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );
  } catch (e) {
    console.log('🌐 archetype_qualities network error:', e?.message ?? String(e));
    return null;
  }

  console.log('🌐 archetype_qualities status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    return null;
  }

  if (!res.ok) return null;

  const { data } = await readResponse(res);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.qualities)) return data.qualities;
  return [];
}

// Toggle notification activation for an unlocked quality.
//   POST /archetypes/user_qualities/activation/  { quality_id, is_active }
// Returns the updated quality payload (status ACTIVE/INACTIVE, can_* flags).
export async function setQualityActivation(qualityId, isActive) {
  const token = await getAccessToken();
  if (!token) throw new Error('Missing access token. Please sign in again.');

  if (typeof qualityId !== 'number') {
    const coerced = Number(qualityId);
    if (!Number.isFinite(coerced)) {
      throw new Error('Invalid quality id');
    }
    qualityId = coerced;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/archetypes/user_qualities/activation/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quality_id: qualityId, is_active: !!isActive }),
    });
  } catch (e) {
    console.log('🌐 user_qualities activation network error:', e?.message ?? String(e));
    throw new Error('Network request failed');
  }

  console.log('🌐 user_qualities activation status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    throw new Error('Session expired. Please sign in again.');
  }

  const { raw, data } = await readResponse(res);

  if (!res.ok) {
    const detail = formatApiError(
      data,
      raw,
      `Quality activation failed (${res.status})`,
    );
    throw new Error(detail);
  }

  return data;
}

// Marks a quality as learned or reverts it.
//   POST /archetypes/user_qualities/completion/  { quality_id, is_completed }
// Returns the updated quality payload (is_completed, status, can_* flags).
export async function setQualityCompletion(qualityId, isCompleted) {
  const token = await getAccessToken();
  if (!token) throw new Error('Missing access token. Please sign in again.');

  if (typeof qualityId !== 'number') {
    const coerced = Number(qualityId);
    if (!Number.isFinite(coerced)) {
      throw new Error('Invalid quality id');
    }
    qualityId = coerced;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/archetypes/user_qualities/completion/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quality_id: qualityId, is_completed: !!isCompleted }),
    });
  } catch (e) {
    console.log('🌐 user_qualities completion network error:', e?.message ?? String(e));
    throw new Error('Network request failed');
  }

  console.log('🌐 user_qualities completion status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    throw new Error('Session expired. Please sign in again.');
  }

  const { raw, data } = await readResponse(res);

  if (!res.ok) {
    throw new Error(
      formatApiError(
        data,
        raw,
        `Quality completion failed (${res.status})`,
      ),
    );
  }

  return data;
}

// Records that the user shared a quality (analytics / backend share card).
//   POST /archetypes/user_qualities/share/  { quality_id, platform? }
// Returns the backend payload when available (may include a share image URL).
export async function recordQualityShare(qualityId, platform) {
  const token = await getAccessToken();
  if (!token) return null;

  if (typeof qualityId !== 'number') return null;

  const body = { quality_id: qualityId };
  if (platform) body.platform = platform;

  let res;
  try {
    res = await fetch(`${API_BASE}/archetypes/user_qualities/share/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.log('🌐 user_qualities share network error:', e?.message ?? String(e));
    return null;
  }

  console.log('🌐 user_qualities share status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    return null;
  }

  if (!res.ok) return null;

  const { data } = await readResponse(res);
  return data || null;
}

export async function getDailyVibe() {
  const token = await getAccessToken();
  if (!token) return null;

  const todayKey = getLocalDateKey();

  // Serve today's vibe from the local cache so it stays stable across
  // re-renders, navigation and re-logins within the same calendar day.
  // A new day invalidates the cache and we fetch a fresh vibe.
  const cached = await readDailyVibeCache();
  if (cached && cached.date === todayKey && cached.data) {
    console.log('🌐 daily_vibe cache hit for', todayKey);
    return cached.data;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/archetypes/daily_vibe/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (e) {
    console.log('🌐 daily_vibe network error:', e?.message ?? String(e));
    // Fall back to a stale cached vibe if we have one so the UI doesn't
    // flash empty when the network is briefly unavailable.
    if (cached && cached.data) return cached.data;
    return null;
  }

  console.log('🌐 daily_vibe status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    return null;
  }

  if (!res.ok) {
    if (cached && cached.data) return cached.data;
    return null;
  }

  const { data } = await readResponse(res);
  if (data) {
    await writeDailyVibeCache({ date: todayKey, data });
    return data;
  }
  return null;
}

// Backends differ on what the "delete my account" endpoint is called.
// Try the most common patterns in order. The first 2xx wins; the first
// non-not-implemented error (i.e. anything that isn't a 404 / 405) is
// surfaced as the real failure.
const DELETE_ACCOUNT_CANDIDATES = [
  { method: 'DELETE', path: '/authentication/user_profile/' },
  { method: 'DELETE', path: '/authentication/me/' },
  { method: 'DELETE', path: '/authentication/user/' },
  { method: 'POST', path: '/authentication/delete_account/' },
  { method: 'POST', path: '/authentication/user_profile/delete/' },
];

export async function deleteAccount() {
  const token = await getAccessToken();
  if (!token) throw new Error('Missing access token. Please sign in again.');

  let firstRealError = null;
  let lastNotFoundDetail = null;

  for (const candidate of DELETE_ACCOUNT_CANDIDATES) {
    let res;
    try {
      res = await fetch(`${API_BASE}${candidate.path}`, {
        method: candidate.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: candidate.method === 'POST' ? JSON.stringify({}) : undefined,
      });
    } catch (e) {
      console.log(
        `🌐 delete account network error (${candidate.method} ${candidate.path}):`,
        e?.message ?? String(e),
      );
      if (!firstRealError) firstRealError = new Error('Network request failed');
      continue;
    }

    console.log(
      `🌐 delete account ${candidate.method} ${candidate.path} status:`,
      res.status,
    );

    if (res.status === 401 || res.status === 403) {
      await handleSessionExpired();
      throw new Error('Session expired. Please sign in again.');
    }

    // 410 Gone = already deleted on this backend, treat as success.
    if (res.status === 410) {
      await clearAccessToken();
      return { status: 'gone' };
    }

    // 404 / 405 mean "this backend doesn't expose this URL/verb",
    // not "the user is gone" — try the next candidate.
    if (res.status === 404 || res.status === 405) {
      try {
        const { raw } = await readResponse(res);
        lastNotFoundDetail = raw || `HTTP ${res.status}`;
      } catch {
        lastNotFoundDetail = `HTTP ${res.status}`;
      }
      continue;
    }

    const { raw, data } = await readResponse(res);

    if (!res.ok) {
      const message =
        data?.message ||
        data?.detail ||
        raw ||
        `Account deletion failed (${res.status})`;
      console.log('❌ delete account server error body:', raw);
      if (!firstRealError) firstRealError = new Error(message);
      // Real backend error (not "endpoint missing") — stop trying further URLs.
      break;
    }

    await clearAccessToken();
    return data || { status: 'success' };
  }

  if (firstRealError) throw firstRealError;
  throw new Error(
    lastNotFoundDetail
      ? `Account deletion is not available on the server (${lastNotFoundDetail}).`
      : 'Account deletion endpoint is not available on the server.',
  );
}

// Tells the backend "the user has subscription purchase data, please
// verify it with Apple/Google and update its state accordingly".
//
// `provider` must be 'apple' or 'google'.
// `receiptData` is the raw payload received from the native store SDK;
// the backend decides how to interpret it.
//
// Resolves with { status, end_date } on success.
// Throws Error('verification-failed', ...) on 400 (bad receipt).
// Throws Error('Session expired ...') on 401/403.
// Throws Error('Network request failed') on connection errors.
export async function verifySubscription(provider, receiptData) {
  if (provider !== 'apple' && provider !== 'google') {
    throw new Error('Invalid subscription provider');
  }
  if (!receiptData || typeof receiptData !== 'object') {
    throw new Error('Missing subscription receipt data');
  }

  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Missing access token. Please sign in again.');

  let res;
  try {
    res = await fetch(`${API_BASE}/payments/verify/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ provider, receipt_data: receiptData }),
    });
  } catch (e) {
    console.log('🌐 verify subscription network error:', e?.message ?? String(e));
    throw new Error('Network request failed');
  }

  console.log('🌐 verify subscription status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    throw new Error('Session expired. Please sign in again.');
  }

  const { raw, data } = await readResponse(res);

  if (res.status === 400) {
    console.log('❌ verify subscription 400 body:', raw);
    const err = new Error(
      data?.message || data?.detail || 'We couldn’t verify your subscription. Please try again.'
    );
    err.code = 'verification-failed';
    throw err;
  }

  if (!res.ok) {
    console.log('❌ verify subscription server body:', raw);
    throw new Error(
      data?.message ||
        data?.detail ||
        raw ||
        `Subscription verification failed (${res.status})`
    );
  }

  return data || { status: 'unknown' };
}

export async function registerDeviceToken(token, platform) {
  if (!token || typeof token !== 'string') return null;
  if (platform !== 'ios' && platform !== 'android') return null;

  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  let res;
  try {
    res = await fetch(`${API_BASE}/notifications/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token, platform }),
    });
  } catch (e) {
    console.log('🌐 register device network error:', e?.message ?? String(e));
    return null;
  }

  console.log('🌐 register device status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    return null;
  }

  if (!res.ok) {
    return null;
  }

  const { data } = await readResponse(res);
  return data || { status: 'ok' };
}

export function isOnboardingComplete(profile) {
  if (!profile || typeof profile !== 'object') return false;
  const hasName =
    typeof profile.name === 'string' && profile.name.trim().length > 0;
  const hasBirthDate =
    typeof profile.birth_date === 'string' && profile.birth_date.length > 0;
  return hasName && hasBirthDate;
}

function formatDjangoError(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.message) return String(data.message);
  if (data.detail) return String(data.detail);
  // Django REST Framework field validation: { field: ["error", ...] }
  const lines = [];
  for (const [field, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      lines.push(`${field}: ${val.join(', ')}`);
    } else if (typeof val === 'string') {
      lines.push(`${field}: ${val}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : null;
}

// When Django serves its yellow debug error page we get a giant HTML
// blob back. Pull just the exception class + message out of it so the
// alert text stays short and readable.
function summarizeHtmlError(raw) {
  if (typeof raw !== 'string' || !raw.includes('<')) return null;
  const titleMatch = raw.match(/<title>([\s\S]*?)<\/title>/i);
  const exceptionType = raw.match(
    /<th>Exception Type:<\/th>\s*<td>([\s\S]*?)<\/td>/i,
  );
  const exceptionValue = raw.match(
    /<th>Exception Value:<\/th>\s*<td><pre[^>]*>([\s\S]*?)<\/pre>/i,
  );

  if (exceptionType || exceptionValue) {
    const t = exceptionType ? exceptionType[1].trim() : null;
    const v = exceptionValue ? exceptionValue[1].trim() : null;
    return [t, v].filter(Boolean).join('\n');
  }
  if (titleMatch) {
    return titleMatch[1].replace(/\s+/g, ' ').trim();
  }
  return null;
}

// HTTP statuses we treat as transient — usually the backend's upstream
// (geocoder / timezone API / DB) blipped and a quick retry will succeed.
const TRANSIENT_STATUSES = new Set([502, 503, 504]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function postOnboardingOnce(payload, token) {
  const res = await fetch(`${API_BASE}/authentication/on_boarding/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload ?? {}),
  });
  return res;
}

export async function postOnboarding(payload) {
  const token = await getAccessToken();
  if (!token) throw new Error('Missing access token. Please sign in again.');

  let res;
  let attempts = 0;
  const MAX_ATTEMPTS = 3;

  // Retry transient gateway errors with a small backoff before giving up.
  for (;;) {
    attempts += 1;
    try {
      res = await postOnboardingOnce(payload, token);
    } catch (e) {
      console.log('🌐 on_boarding network error:', e?.message ?? String(e));
      if (attempts < MAX_ATTEMPTS) {
        await sleep(800 * attempts);
        continue;
      }
      throw new Error(
        'We couldn’t reach the server. Please check your connection and try again.',
      );
    }

    if (TRANSIENT_STATUSES.has(res.status) && attempts < MAX_ATTEMPTS) {
      console.log(
        `🌐 on_boarding ${res.status} — retrying (attempt ${attempts + 1}/${MAX_ATTEMPTS})`,
      );
      await sleep(800 * attempts);
      continue;
    }

    break;
  }

  const { raw, data } = await readResponse(res);

  console.log('🌐 on_boarding status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await handleSessionExpired();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    console.log('❌ on_boarding error body:', raw);
    const friendly =
      formatDjangoError(data) ||
      summarizeHtmlError(raw) ||
      `Onboarding submit failed (${res.status})`;

    // 502 / 503 / 504 → backend's upstream is sick (geocoder, timezone
    // service, etc.). Tell the user it's transient instead of "report a
    // bug", since a few seconds later it usually works.
    if (TRANSIENT_STATUSES.has(res.status)) {
      const err = new Error(
        'Our servers are having trouble looking up your birth location ' +
          'right now. Please wait a few seconds and try again.',
      );
      err.code = 'transient-error';
      throw err;
    }

    // Other 5xx with a Django HTML traceback = backend bug, not a
    // frontend validation failure. Surface that fact so the user can
    // report it.
    if (res.status >= 500) {
      const err = new Error(
        `Server error (${res.status}): ${friendly}\n\n` +
          'This is a backend issue. Please report it to support.',
      );
      err.code = 'server-error';
      throw err;
    }

    throw new Error(friendly);
  }

  return data;
}
