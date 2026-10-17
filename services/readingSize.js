// Device reading size. The scale is read by React Native while it flattens
// text styles, so one choice enlarges the writing across the app.
import * as SecureStore from 'expo-secure-store';

const SIZE_KEY = 'astro-reading-size';
const HINT_KEY = 'astro-reading-hint-users';

export const READING_SIZES = ['standard', 'large'];

const SCALE = {
  standard: 1,
  large: 1.25,
};

let size = 'standard';
const listeners = new Set();

function publish() {
  global.__astroReadingScale = SCALE[size] || 1;
  listeners.forEach((listener) => listener());
}

publish();

export function getReadingSize() {
  return size;
}

export function getReadingScale() {
  return SCALE[size] || 1;
}

export function subscribeReadingSize(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loadReadingSize() {
  try {
    const stored = await SecureStore.getItemAsync(SIZE_KEY);
    if (stored === 'large' || stored === 'extra') {
      size = 'large';
      publish();
    } else if (stored === 'standard') {
      size = 'standard';
      publish();
    }
  } catch (e) {
    console.log('[ReadingSize] load failed:', e?.message ?? String(e));
  }
}

export async function chooseReadingSize(next) {
  if (next !== 'standard' && next !== 'large') return;
  size = next;
  publish();
  try {
    await SecureStore.setItemAsync(SIZE_KEY, next);
  } catch (e) {
    console.log('[ReadingSize] save failed:', e?.message ?? String(e));
  }
}

export async function shouldShowReadingHint(userId) {
  if (userId == null || userId === '') return false;
  try {
    const raw = await SecureStore.getItemAsync(HINT_KEY);
    const seen = raw ? JSON.parse(raw) : [];
    return !Array.isArray(seen) || !seen.map(String).includes(String(userId));
  } catch (e) {
    console.log('[ReadingSize] hint read failed:', e?.message ?? String(e));
    return false;
  }
}

export async function dismissReadingHint(userId) {
  if (userId == null || userId === '') return;
  try {
    const raw = await SecureStore.getItemAsync(HINT_KEY);
    const seen = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(seen) ? seen.map(String) : [];
    const id = String(userId);
    if (!list.includes(id)) list.push(id);
    await SecureStore.setItemAsync(HINT_KEY, JSON.stringify(list.slice(-40)));
  } catch (e) {
    console.log('[ReadingSize] hint save failed:', e?.message ?? String(e));
  }
}
