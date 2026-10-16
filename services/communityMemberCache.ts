// The directory response is the only copy of a member we have, and the photo
// is a signed URL. Putting that URL on the route corrupts it — query parsing
// turns "+" into a space — so the opened profile renders a blank avatar.
// Keep the row here and navigate with the rest of the fields only.

const members = new Map<string, any>();
let viewerKey: string | null = null;

export function clearCommunityMembers() {
  members.clear();
}

// Drop saved rows when the signed-in account or premium access changes, so a
// later profile cannot reuse social links that were hidden or unlocked earlier.
export function syncCommunityViewer(userId: string | null, premium: boolean | null) {
  const next = `${userId ?? ''}:${premium === true ? '1' : premium === false ? '0' : '?'}`;
  if (viewerKey != null && viewerKey !== next) members.clear();
  viewerKey = next;
}

export function rememberCommunityMember(member: { id?: string | number | null }) {
  if (member?.id == null) return;
  members.set(String(member.id), member);
}

export function recallCommunityMember(id: string | number | null | undefined) {
  if (id == null || id === '') return null;
  return members.get(String(id)) ?? null;
}
