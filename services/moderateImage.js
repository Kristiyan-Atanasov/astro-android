// services/moderateImage.js
// Client-side file sanity checks only. NSFW / content decisions are owned
// by the backend — do not ship DeepAI / Hugging Face credentials via Expo
// public config, and do not fail-open past a failed remote check.

const LOG = '[ModerateImage]';

const MIN_SIDE = 72;

/**
 * Last look at a picked photo before it is uploaded.
 *
 * This makes no content judgement — the backend owns that and still runs it on
 * upload — so the only thing worth stopping here is an image we can prove is
 * unusable. Everything it needs comes from what the picker already reported,
 * deliberately: earlier versions re-read the file and re-encoded it just to
 * measure it, which meant any hiccup in the native imaging modules surfaced to
 * the user as a failed safety check and cost them their upload. A local check
 * that cannot run is not evidence against someone's photo.
 *
 * @param {string} uri
 * @param {{ width?: number, height?: number } | null | undefined} dimensions
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function moderateProfileImage(uri, dimensions) {
  if (!uri) return { ok: false, reason: 'invalid' };

  const width = Number(dimensions?.width);
  const height = Number(dimensions?.height);
  const measured =
    Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;

  if (measured && (width < MIN_SIDE || height < MIN_SIDE)) {
    console.log(LOG, 'rejected: smaller than', MIN_SIDE, `(${width}x${height})`);
    return { ok: false, reason: 'bad_dimensions' };
  }

  return { ok: true };
}
