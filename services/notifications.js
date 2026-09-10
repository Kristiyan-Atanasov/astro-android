// services/notifications.js
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { registerDeviceToken } from './api';

const REGISTERED_TOKEN_KEY = 'fcmDeviceTokenRegistered';
const PENDING_DISMISS_KEY = 'pushPendingAutoDismiss';
const AUTO_DISMISS_MS = 60 * 60 * 1000; // 1 hour

const dismissTimers = new Map();
let autoDismissReceiveSub = null;
let autoDismissRefCount = 0;

async function readPendingDismissals() {
  try {
    const raw = await SecureStore.getItemAsync(PENDING_DISMISS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

async function writePendingDismissals(map) {
  try {
    await SecureStore.setItemAsync(PENDING_DISMISS_KEY, JSON.stringify(map));
  } catch {}
}

function clearDismissTimer(identifier) {
  const handle = dismissTimers.get(identifier);
  if (handle != null) {
    clearTimeout(handle);
    dismissTimers.delete(identifier);
  }
}

async function dismissTrackedNotification(identifier) {
  if (!identifier) return;
  clearDismissTimer(identifier);
  try {
    await Notifications.dismissNotificationAsync(identifier);
  } catch (e) {
    console.log(
      'Auto-dismiss notification failed:',
      e?.message ?? String(e),
    );
  }
  const map = await readPendingDismissals();
  if (map[identifier] != null) {
    delete map[identifier];
    await writePendingDismissals(map);
  }
}

function scheduleDismissTimer(identifier, delayMs) {
  clearDismissTimer(identifier);
  const handle = setTimeout(() => {
    dismissTimers.delete(identifier);
    void dismissTrackedNotification(identifier);
  }, Math.max(0, delayMs));
  dismissTimers.set(identifier, handle);
}

async function trackNotificationForAutoDismiss(notificationOrId) {
  const identifier =
    typeof notificationOrId === 'string'
      ? notificationOrId
      : notificationOrId?.request?.identifier;
  if (!identifier) return;

  const expiresAt = Date.now() + AUTO_DISMISS_MS;
  const map = await readPendingDismissals();
  map[identifier] = expiresAt;
  await writePendingDismissals(map);
  scheduleDismissTimer(identifier, AUTO_DISMISS_MS);
}

async function cancelNotificationAutoDismiss(identifier) {
  if (!identifier) return;
  clearDismissTimer(identifier);
  const map = await readPendingDismissals();
  if (map[identifier] == null) return;
  delete map[identifier];
  await writePendingDismissals(map);
}

/**
 * Best-effort: dismiss tray notifications ~1 hour after we first see them.
 * Timers run while the JS app is alive; on next launch we sweep anything
 * already past its expiry (covers killed / background gaps).
 */
export async function sweepAutoDismissNotifications() {
  const now = Date.now();
  const map = await readPendingDismissals();
  let changed = false;

  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const entry of presented) {
      const id = entry?.request?.identifier;
      if (!id) continue;
      if (map[id] == null) {
        map[id] = now + AUTO_DISMISS_MS;
        changed = true;
      }
    }
  } catch (e) {
    console.log(
      'List presented notifications failed:',
      e?.message ?? String(e),
    );
  }

  for (const [id, expiresAtRaw] of Object.entries(map)) {
    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt)) {
      delete map[id];
      changed = true;
      continue;
    }
    const remaining = expiresAt - now;
    if (remaining <= 0) {
      clearDismissTimer(id);
      try {
        await Notifications.dismissNotificationAsync(id);
      } catch (e) {
        console.log(
          'Sweep dismiss failed:',
          e?.message ?? String(e),
        );
      }
      delete map[id];
      changed = true;
    } else {
      scheduleDismissTimer(id, remaining);
    }
  }

  if (changed) await writePendingDismissals(map);
}

/** Start receive listener + initial sweep. Safe to call from multiple mounts. */
export function startNotificationAutoDismiss() {
  void sweepAutoDismissNotifications();
  autoDismissRefCount += 1;
  if (!autoDismissReceiveSub) {
    autoDismissReceiveSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        void trackNotificationForAutoDismiss(notification);
      },
    );
  }
  return () => {
    autoDismissRefCount = Math.max(0, autoDismissRefCount - 1);
    if (autoDismissRefCount === 0 && autoDismissReceiveSub) {
      try {
        autoDismissReceiveSub.remove();
      } catch {}
      autoDismissReceiveSub = null;
    }
  };
}

// When a notification arrives while app is foregrounded, show the banner
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission() {
  if (!Device.isDevice) {
    return { granted: false, reason: 'not-a-device' };
  }
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) {
    return { granted: true };
  }
  if (settings.canAskAgain === false) {
    return { granted: false, reason: 'denied' };
  }
  const req = await Notifications.requestPermissionsAsync();
  return { granted: !!req.granted };
}

export async function getNativeDevicePushToken() {
  if (!Device.isDevice) return null;
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    if (!token || typeof token.data !== 'string') return null;
    return {
      token: token.data,
      platform: 'android',
    };
  } catch (e) {
    console.log('Get device push token failed:', e?.message ?? String(e));
    return null;
  }
}

/**
 * One-shot helper: ask permission (if not granted) and register the token
 * with the backend. Safe to call repeatedly — backend upserts.
 */
export async function registerForPushNotifications() {
  const perm = await ensureNotificationPermission();
  if (!perm.granted) return { ok: false, reason: perm.reason ?? 'denied' };

  const native = await getNativeDevicePushToken();
  if (!native) return { ok: false, reason: 'no-token' };

  const result = await registerDeviceToken(native.token, native.platform);
  if (!result) return { ok: false, reason: 'backend-failed' };

  try {
    await SecureStore.setItemAsync(REGISTERED_TOKEN_KEY, native.token);
  } catch {}
  return { ok: true, token: native.token };
}

/**
 * Lightweight call for app launches: if we already registered this token
 * before, skip the network round-trip. Backend still gets re-registered
 * whenever the token rotates.
 */
export async function syncDeviceTokenIfChanged() {
  const native = await getNativeDevicePushToken();
  if (!native) return { ok: false, reason: 'no-token' };

  let lastRegistered = null;
  try {
    lastRegistered = await SecureStore.getItemAsync(REGISTERED_TOKEN_KEY);
  } catch {}

  if (lastRegistered === native.token) {
    return { ok: true, skipped: true, token: native.token };
  }

  const result = await registerDeviceToken(native.token, native.platform);
  if (!result) return { ok: false, reason: 'backend-failed' };

  try {
    await SecureStore.setItemAsync(REGISTERED_TOKEN_KEY, native.token);
  } catch {}
  return { ok: true, token: native.token };
}

export async function clearRegisteredToken() {
  try {
    await SecureStore.deleteItemAsync(REGISTERED_TOKEN_KEY);
  } catch {}
}

/**
 * Parse FCM payload to a route string for expo-router.
 * All values are strings per backend contract.
 */
export function routeFromNotificationData(data) {
  if (!data || typeof data !== 'object') return null;

  const type = typeof data.type === 'string' ? data.type : null;
  const screen = typeof data.screen === 'string' ? data.screen : null;
  const archetype =
    typeof data.archetype === 'string' && data.archetype.length > 0
      ? data.archetype.toUpperCase()
      : null;

  const archetypeRoute = archetype
    ? `/archetype/${archetype}?fromNotification=1`
    : null;

  if (type === 'quality_activated' && archetype) {
    return archetypeRoute;
  }
  if (screen === 'ArchetypeDetail' && archetype) {
    return archetypeRoute;
  }
  if (archetype) {
    return archetypeRoute;
  }
  return '/home';
}

/**
 * Subscribe to taps from background / killed-state notifications,
 * plus foreground deliveries. Returns an unsubscribe fn.
 */
export function subscribeToNotificationTaps(onRoute) {
  if (typeof onRoute !== 'function') return () => {};

  const stopAutoDismiss = startNotificationAutoDismiss();

  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      try {
        const identifier = response?.notification?.request?.identifier;
        if (identifier) void cancelNotificationAutoDismiss(identifier);
        const data = response?.notification?.request?.content?.data;
        const route = routeFromNotificationData(data);
        if (route) onRoute(route, data);
      } catch (e) {
        console.log('Notification tap handler failed:', e?.message ?? String(e));
      }
    },
  );

  // Handle the case where the app was launched from a terminated state by a notification
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!response) return;
      const identifier = response?.notification?.request?.identifier;
      if (identifier) void cancelNotificationAutoDismiss(identifier);
      const data = response?.notification?.request?.content?.data;
      const route = routeFromNotificationData(data);
      if (route) onRoute(route, data);
    })
    .catch(() => {});

  return () => {
    try {
      responseSub.remove();
    } catch {}
    try {
      stopAutoDismiss();
    } catch {}
  };
}
