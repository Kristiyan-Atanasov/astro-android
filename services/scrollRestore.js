// services/scrollRestore.js
// Remembers scroll offsets across stack navigation so back returns to the
// same place instead of jumping to the top.

const offsets = new Map();

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

export function clearScrollRestore(screenKey) {
  offsets.delete(screenKey);
}
