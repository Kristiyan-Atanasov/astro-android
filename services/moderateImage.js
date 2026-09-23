// services/moderateImage.js
// Client-side file sanity checks only. NSFW / content decisions are owned
// by the backend — do not ship DeepAI / Hugging Face credentials via Expo
// public config, and do not fail-open past a failed remote check.

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

const LOG = '[ModerateImage]';

const MAX_BYTES = 5 * 1024 * 1024;
const MIN_SIDE = 72;

/**
 * @param {string} uri
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function moderateProfileImage(uri) {
  if (!uri) return { ok: false, reason: 'invalid' };

  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    if (!info.exists) return { ok: false, reason: 'invalid' };
    if (typeof info.size === 'number' && info.size > MAX_BYTES) {
      return { ok: false, reason: 'too_large' };
    }

    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 512 } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

    if (resized.width < MIN_SIDE || resized.height < MIN_SIDE) {
      return { ok: false, reason: 'bad_dimensions' };
    }

    return { ok: true };
  } catch (e) {
    console.log(LOG, 'moderation failed', e?.message ?? e);
    return { ok: false, reason: 'check_failed' };
  }
}
