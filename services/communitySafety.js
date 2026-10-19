// Local record of people blocked during this session. The server hides them
// on the next Community request; this only clears profiles already on screen.
import { forgetCommunityMember } from './communityMemberCache';

const blockedIds = new Set();
const listeners = new Set();
let version = 0;

function publish() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function getCommunitySafetyVersion() {
  return version;
}

export function subscribeCommunitySafety(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isCommunityUserBlocked(userId) {
  if (userId == null || userId === '') return false;
  return blockedIds.has(String(userId));
}

export function markCommunityUserBlocked(userId) {
  if (userId == null || userId === '') return;
  blockedIds.add(String(userId));
  forgetCommunityMember(userId);
  publish();
}

export function markCommunityUserUnblocked(userId) {
  if (userId == null || userId === '') return;
  blockedIds.delete(String(userId));
  publish();
}
