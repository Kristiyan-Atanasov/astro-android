// services/api.js
import * as SecureStore from 'expo-secure-store';

export const API_BASE = 'https://yrfz6x9dl1.execute-api.eu-central-1.amazonaws.com/dev';

const ACCESS_TOKEN_KEY = 'accessToken';

let cachedAccessToken = null;
let cachedAccessTokenPromise = null;

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
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
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

export async function getUserProfile() {
  const token = await getAccessToken();
  if (!token) return null;

  let res;
  try {
    res = await fetch(`${API_BASE}/authentication/user_profile/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (e) {
    console.log('🌐 user_profile network error:', e?.message ?? String(e));
    return null;
  }

  console.log('🌐 user_profile status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await clearAccessToken();
    return null;
  }

  if (!res.ok) return null;

  const { data } = await readResponse(res);
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
    await clearAccessToken();
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
    await clearAccessToken();
    return null;
  }

  if (!res.ok) return null;

  const { data } = await readResponse(res);
  return data || null;
}

export async function getUserQualities() {
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
    await clearAccessToken();
    return null;
  }

  if (!res.ok) return null;

  const { data } = await readResponse(res);
  // Backend wraps the list in { qualities: [...] } per OpenAPI spec, but
  // tolerate older shapes (top-level array) too.
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.qualities)) return data.qualities;
  return [];
}

export async function updateUserQualityStatus(qualityId, status) {
  const token = await getAccessToken();
  if (!token) throw new Error('Missing access token. Please sign in again.');

  if (typeof qualityId !== 'number') {
    throw new Error('Invalid quality id');
  }
  // Backend expects { quality_id, status: 'ACTIVE' | 'INACTIVE' } per
  // UserQualityStatusUpdateRequest in the OpenAPI spec.
  const normalized = String(status || '').toUpperCase();
  if (normalized !== 'ACTIVE' && normalized !== 'INACTIVE') {
    throw new Error('Invalid quality status');
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/archetypes/user_qualities/update_status/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quality_id: qualityId, status: normalized }),
    });
  } catch (e) {
    console.log('🌐 user_qualities update network error:', e?.message ?? String(e));
    throw new Error('Network request failed');
  }

  console.log('🌐 user_qualities update status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await clearAccessToken();
    throw new Error('Session expired. Please sign in again.');
  }

  const { raw, data } = await readResponse(res);

  if (!res.ok) {
    throw new Error(
      data?.message ||
        data?.detail ||
        raw ||
        `Quality update failed (${res.status})`
    );
  }

  return data;
}

export async function getDailyVibe() {
  const token = await getAccessToken();
  if (!token) return null;

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
    return null;
  }

  console.log('🌐 daily_vibe status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await clearAccessToken();
    return null;
  }

  if (!res.ok) return null;

  const { data } = await readResponse(res);
  return data || null;
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
      await clearAccessToken();
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
    await clearAccessToken();
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
    await clearAccessToken();
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

export async function postOnboarding(payload) {
  const token = await getAccessToken();
  if (!token) throw new Error('Missing access token. Please sign in again.');

  let res;
  try {
    res = await fetch(`${API_BASE}/authentication/on_boarding/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload ?? {}),
    });
  } catch (e) {
    console.log('🌐 on_boarding network error:', e?.message ?? String(e));
    throw new Error(
      'We couldn’t reach the server. Please check your connection and try again.',
    );
  }

  const { raw, data } = await readResponse(res);

  console.log('🌐 on_boarding status:', res.status);

  if (res.status === 401 || res.status === 403) {
    await clearAccessToken();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    console.log('❌ on_boarding error body:', raw);
    const friendly =
      formatDjangoError(data) ||
      summarizeHtmlError(raw) ||
      `Onboarding submit failed (${res.status})`;

    // 5xx with a Django HTML traceback = backend bug, not a frontend
    // validation failure. Surface that fact so the user can report it.
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
