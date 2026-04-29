// services/notifications.js
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { registerDeviceToken } from './api';

const REGISTERED_TOKEN_KEY = 'fcmDeviceTokenRegistered';

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
  const req = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return { granted: !!req.granted };
}

export async function getNativeDevicePushToken() {
  if (!Device.isDevice) return null;
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    if (!token || typeof token.data !== 'string') return null;
    return {
      token: token.data,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
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

  if (type === 'quality_activated' && archetype) {
    return `/archetype/${archetype}`;
  }
  if (screen === 'ArchetypeDetail' && archetype) {
    return `/archetype/${archetype}`;
  }
  if (archetype) {
    return `/archetype/${archetype}`;
  }
  return '/home';
}

/**
 * Subscribe to taps from background / killed-state notifications,
 * plus foreground deliveries. Returns an unsubscribe fn.
 */
export function subscribeToNotificationTaps(onRoute) {
  if (typeof onRoute !== 'function') return () => {};

  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      try {
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
      const data = response?.notification?.request?.content?.data;
      const route = routeFromNotificationData(data);
      if (route) onRoute(route, data);
    })
    .catch(() => {});

  return () => {
    try {
      responseSub.remove();
    } catch {}
  };
}
