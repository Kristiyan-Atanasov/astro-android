// services/sessionEvents.js
// Tiny event bus so api.js can notify the UI about session expiry without
// importing React Navigation directly.

let listeners = [];
let emittingScheduled = false;

function scheduleEmit() {
  if (emittingScheduled) return;
  emittingScheduled = true;
  setTimeout(() => {
    emittingScheduled = false;
    const snapshot = listeners.slice();
    snapshot.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.log('Session expiry listener failed:', e?.message ?? String(e));
      }
    });
  }, 0);
}

export function onSessionExpired(callback) {
  if (typeof callback !== 'function') return () => {};
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((c) => c !== callback);
  };
}

export function notifySessionExpired() {
  scheduleEmit();
}
