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
  return Array.isArray(data) ? data : null;
}

export async function updateUserQualityStatus(qualityId, action) {
  const token = await getAccessToken();
  if (!token) throw new Error('Missing access token. Please sign in again.');

  if (typeof qualityId !== 'number') {
    throw new Error('Invalid quality id');
  }
  if (action !== 'activate' && action !== 'deactivate') {
    throw new Error('Invalid action');
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/archetypes/user_qualities/update_status/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quality_id: qualityId, action }),
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

export function isOnboardingComplete(profile) {
  if (!profile || typeof profile !== 'object') return false;
  const hasName =
    typeof profile.name === 'string' && profile.name.trim().length > 0;
  const hasBirthDate =
    typeof profile.birth_date === 'string' && profile.birth_date.length > 0;
  return hasName && hasBirthDate;
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
    throw new Error('Network request failed');
  }

  const { raw, data } = await readResponse(res);

  console.log('🌐 on_boarding status:', res.status);

  if (!res.ok) {
    throw new Error(
      data?.message ||
        data?.detail ||
        raw ||
        `Onboarding submit failed (${res.status})`
    );
  }

  return data;
}
