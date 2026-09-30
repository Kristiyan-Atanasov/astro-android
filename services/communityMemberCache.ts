// The directory response is the only copy of a member we have, and the photo
// is a signed URL. Putting that URL on the route corrupts it — query parsing
// turns "+" into a space — so the opened profile renders a blank avatar.
// Keep the row here and navigate with the rest of the fields only.

const members = new Map<string, any>();

export function rememberCommunityMember(member: { id?: string | number | null }) {
  if (member?.id == null) return;
  members.set(String(member.id), member);
}

export function recallCommunityMember(id: string | number | null | undefined) {
  if (id == null || id === '') return null;
  return members.get(String(id)) ?? null;
}
