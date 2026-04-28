// services/api.js
import * as SecureStore from 'expo-secure-store';

export const API_BASE = 'https://yrfz6x9dl1.execute-api.eu-central-1.amazonaws.com/dev';

const ACCESS_TOKEN_KEY = 'accessToken';

export async function setAccessToken(token) {
  if (!token || typeof token !== 'string') return;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken() {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  return token || null;
}

export async function clearAccessToken() {
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
  console.log('🌐 on_boarding raw:', raw);

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
