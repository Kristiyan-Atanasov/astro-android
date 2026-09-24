// Shared by the community directory and the member detail screen, so both
// read a handle the same way and open the same link for it.

const SOCIAL_BASE_URL = {
  instagram: 'https://instagram.com/',
  facebook: 'https://facebook.com/',
} as const;

export type SocialPlatform = keyof typeof SOCIAL_BASE_URL;

// Handles are free text at onboarding, so people type "@name", "name",
// "instagram.com/name" or a full URL. Reduce all of those to the username
// so we can build one predictable profile link. Links that carry a query
// (facebook.com/profile.php?id=123 has no username) are kept whole instead,
// because truncating them would point at the wrong page.
export function normalizeHandle(value: any): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const path = trimmed
    .replace(/^https?:\/\//i, '')
    .replace(/^www\.|^m\./i, '')
    .replace(/^(?:instagram|facebook|fb)\.com\/?/i, '')
    .replace(/^@+/, '');
  if (/[?=]/.test(path)) {
    return /^https?:\/\//i.test(trimmed) ? trimmed : null;
  }
  return path.split(/[/#]/)[0].trim() || null;
}

export const isProfileUrl = (handle: string) => /^https?:\/\//i.test(handle);

export function socialProfileUrl(platform: SocialPlatform, handle: string) {
  return isProfileUrl(handle)
    ? handle
    : `${SOCIAL_BASE_URL[platform]}${encodeURIComponent(handle)}`;
}
