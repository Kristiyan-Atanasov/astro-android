// services/moderateImage.js
// RN-safe profile photo checks: file rules + remote NSFW classification.
// (On-device NSFWJS/TFJS is not compatible with React Native / Metro.)

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';

const LOG = '[ModerateImage]';

const MAX_BYTES = 6 * 1024 * 1024;
const MIN_SIDE = 96;
const NSFW_SCORE_LIMIT = 0.65;

function extra() {
  return Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};
}

function deepAiKey() {
  return String(
    extra().deepAiApiKey || process.env.EXPO_PUBLIC_DEEPAI_API_KEY || '',
  ).trim();
}

function huggingFaceToken() {
  return String(
    extra().huggingFaceToken || process.env.EXPO_PUBLIC_HF_TOKEN || '',
  ).trim();
}

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

    // Normalize for checks + smaller upload to the classifier.
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 512 } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );

    if (resized.width < MIN_SIDE || resized.height < MIN_SIDE) {
      return { ok: false, reason: 'bad_dimensions' };
    }
    if (!resized.base64) return { ok: false, reason: 'invalid' };

    const nsfw = await classifyNsfw(resized.base64);
    if (nsfw.reason === 'nsfw') return { ok: false, reason: 'nsfw' };
    if (nsfw.reason === 'check_failed' && nsfw.required) {
      return { ok: false, reason: 'check_failed' };
    }
    // If no moderation provider is configured / reachable, file rules still apply.
    if (nsfw.reason === 'check_failed') {
      console.log(LOG, 'NSFW provider unavailable — allowing after basic file checks');
    }

    return { ok: true };
  } catch (e) {
    console.log(LOG, 'moderation failed', e?.message ?? e);
    return { ok: false, reason: 'check_failed' };
  }
}

async function classifyNsfw(base64Jpeg) {
  const deepKey = deepAiKey();
  if (deepKey) {
    const result = await classifyWithDeepAi(base64Jpeg, deepKey);
    return { ...result, required: true };
  }

  const token = huggingFaceToken();
  const result = await classifyWithHuggingFace(base64Jpeg, token);
  // Token configured → treat failures as hard failures.
  return { ...result, required: Boolean(token) };
}

async function classifyWithDeepAi(base64Jpeg, apiKey) {
  try {
    const form = new FormData();
    form.append('image', `data:image/jpeg;base64,${base64Jpeg}`);

    const res = await fetch('https://api.deepai.org/api/nsfw-detector', {
      method: 'POST',
      headers: { 'api-key': apiKey },
      body: form,
    });

    if (!res.ok) {
      console.log(LOG, 'deepai status', res.status);
      return { reason: 'check_failed' };
    }

    const json = await res.json();
    const score = Number(json?.output?.nsfw_score);
    console.log(LOG, 'deepai score', score);
    if (!Number.isFinite(score)) return { reason: 'check_failed' };
    if (score >= NSFW_SCORE_LIMIT) return { reason: 'nsfw' };
    return { reason: 'ok' };
  } catch (e) {
    console.log(LOG, 'deepai failed', e?.message ?? e);
    return { reason: 'check_failed' };
  }
}

async function classifyWithHuggingFace(base64Jpeg, token) {
  try {
    // Convert base64 → binary for the inference API.
    const binary = Uint8Array.from(atob(base64Jpeg), (c) => c.charCodeAt(0));
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/octet-stream',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
      'https://api-inference.huggingface.co/models/Falconsai/nsfw_image_detection',
      {
        method: 'POST',
        headers,
        body: binary,
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.log(LOG, 'hf status', res.status, text.slice(0, 200));
      return { reason: 'check_failed' };
    }

    const json = await res.json();
    // Expected: [{ label: 'nsfw' | 'normal', score: number }, ...]
    const rows = Array.isArray(json) ? json : [];
    const nsfwRow = rows.find(
      (row) =>
        String(row?.label || '').toLowerCase().includes('nsfw') ||
        String(row?.label || '').toLowerCase() === 'porn' ||
        String(row?.label || '').toLowerCase() === 'hentai',
    );
    const score = Number(nsfwRow?.score);
    console.log(LOG, 'hf scores', rows);
    if (Number.isFinite(score) && score >= NSFW_SCORE_LIMIT) {
      return { reason: 'nsfw' };
    }

    // Some model versions use labels like "nsfw" vs "normal" — also check max adult-ish label.
    let adult = 0;
    for (const row of rows) {
      const label = String(row?.label || '').toLowerCase();
      if (
        label.includes('nsfw') ||
        label.includes('porn') ||
        label.includes('hentai') ||
        label.includes('sexy')
      ) {
        adult = Math.max(adult, Number(row.score) || 0);
      }
    }
    if (adult >= NSFW_SCORE_LIMIT) return { reason: 'nsfw' };

    if (!rows.length) return { reason: 'check_failed' };
    return { reason: 'ok' };
  } catch (e) {
    console.log(LOG, 'hf failed', e?.message ?? e);
    return { reason: 'check_failed' };
  }
}
