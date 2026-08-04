// services/readProgress.js
//
// Local, on-device tracking of which archetype qualities the user has opened
// and read. The backend currently exposes no "mark as read" endpoint (only
// activation status), so reading progress is persisted locally and merged
// with the backend's `is_completed` flag when computing progress bars.
//
// Progress is namespaced per user id so it survives logout/login on the same
// device and stays separate between accounts. It is intentionally NOT cleared
// on logout — only the "active user" pointer is detached.

import * as SecureStore from 'expo-secure-store';

// JSON map of { [userId]: number[] }.
const STORAGE_KEY = 'readQualityIdsByUser';
// Which user's progress is currently active (set when a profile loads).
const ACTIVE_USER_KEY = 'readProgressActiveUser';

let cachedActiveUser = null;

export async function setReadProgressUser(userId) {
  const id = userId != null && userId !== '' ? String(userId) : null;
  cachedActiveUser = id;
  try {
    if (id) {
      await SecureStore.setItemAsync(ACTIVE_USER_KEY, id);
    } else {
      await SecureStore.deleteItemAsync(ACTIVE_USER_KEY);
    }
  } catch (e) {
    console.log('readProgress set user failed:', e?.message ?? String(e));
  }
}

async function getActiveUserKey() {
  if (cachedActiveUser != null) return cachedActiveUser;
  try {
    cachedActiveUser = (await SecureStore.getItemAsync(ACTIVE_USER_KEY)) || null;
  } catch {
    cachedActiveUser = null;
  }
  return cachedActiveUser;
}

function bucketFor(userId) {
  return userId || 'anon';
}

async function readAll() {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (e) {
    console.log('readProgress load failed:', e?.message ?? String(e));
    return {};
  }
}

async function writeAll(map) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.log('readProgress save failed:', e?.message ?? String(e));
  }
}

export async function getReadQualityIds() {
  const user = await getActiveUserKey();
  const map = await readAll();
  const ids = map[bucketFor(user)];
  return Array.isArray(ids) ? ids.filter((n) => typeof n === 'number') : [];
}

export async function markQualityRead(id) {
  if (typeof id !== 'number') return getReadQualityIds();
  const user = await getActiveUserKey();
  const key = bucketFor(user);
  const map = await readAll();
  const ids = Array.isArray(map[key]) ? map[key] : [];
  if (ids.includes(id)) return ids;
  const next = [...ids, id];
  map[key] = next;
  await writeAll(map);
  return next;
}

// Clears the active user's read progress (e.g. on account deletion).
export async function clearReadQualities() {
  const user = await getActiveUserKey();
  const key = bucketFor(user);
  const map = await readAll();
  if (map[key]) {
    delete map[key];
    await writeAll(map);
  }
}
