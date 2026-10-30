// services/scrollRestore.js
// Remembers scroll offsets across stack navigation so back returns to the
// same place instead of jumping to the top.

const offsets = new Map();
const tabs = new Map();

export function rememberScroll(screenKey, y) {
  if (typeof y !== 'number' || !Number.isFinite(y) || y < 0) return;
  offsets.set(screenKey, y);
}

export function takeScrollRestore(screenKey) {
  if (!offsets.has(screenKey)) return null;
  const y = offsets.get(screenKey);
  offsets.delete(screenKey);
  return typeof y === 'number' ? y : null;
}

export function rememberTab(screenKey, tab) {
  if (tab !== 'mastering' && tab !== 'managing') return;
  tabs.set(screenKey, tab);
}

export function peekTabRestore(screenKey) {
  const tab = tabs.get(screenKey);
  return tab === 'mastering' || tab === 'managing' ? tab : null;
}

export function takeTabRestore(screenKey) {
  const tab = peekTabRestore(screenKey);
  if (tab) tabs.delete(screenKey);
  return tab;
}

export function clearScrollRestore(screenKey) {
  offsets.delete(screenKey);
  tabs.delete(screenKey);
}
