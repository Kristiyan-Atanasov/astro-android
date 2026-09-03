// services/moderateImage.js
// RN-safe profile photo checks: file rules + remote NSFW classification.
// (On-device NSFWJS/TFJS is not compatible with React Native / Metro.)

import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';

const LOG = '[ModerateImage]';

const MAX_BYTES = 5 * 1024 * 1024;
const MIN_SIDE = 72;
const DEFAULT_NSFW_SCORE_LIMIT = 0.85;
const BLOCK_LABELS = new Set(['nsfw', 'porn', 'hentai']);

function extra() {
  return Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};
}

function nsfwScoreLimit() {
  const configured = Number(extra().nsfwScoreLimit);
  if (Number.isFinite(configured) && configured > 0 && configured <= 1) {
    return configured;
  }
  return DEFAULT_NSFW_SCORE_LIMIT;
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

function isBlockedLabel(label) {
  const normalized = String(label || '').toLowerCase();
  for (const blocked of BLOCK_LABELS) {
    if (normalized.includes(blocked)) return true;
  }
  return false;
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

    // If moderation is unavailable, allow the upload after basic file checks.
    // Blocking normal photos because an API timed out is worse than letting
    // a borderline image through while we rely on manual review/reporting.
    if (nsfw.reason === 'check_failed') {
      console.log(
        LOG,
        'NSFW provider unavailable — allowing after basic file checks',
      );
    }

    return { ok: true };
  } catch (e) {
    console.log(LOG, 'moderation failed', e?.message ?? e);
    // Fail open on unexpected processing errors too (e.g. odd HEIC edge cases).
    return { ok: true };
  }
}

async function classifyNsfw(base64Jpeg) {
  const limit = nsfwScoreLimit();
  const deepKey = deepAiKey();
  const hfToken = huggingFaceToken();

  if (deepKey) {
    const deepResult = await classifyWithDeepAi(base64Jpeg, deepKey, limit);
    if (deepResult.reason === 'ok' || deepResult.reason === 'nsfw') {
      return deepResult;
    }
    console.log(LOG, 'deepai unavailable, trying fallback if configured');
  }

  if (hfToken || !deepKey) {
    return classifyWithHuggingFace(base64Jpeg, hfToken, limit);
  }

  return { reason: 'check_failed' };
}

async function classifyWithDeepAi(base64Jpeg, apiKey, limit) {
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
    console.log(LOG, 'deepai score', score, 'limit', limit);
    if (!Number.isFinite(score)) return { reason: 'check_failed' };
    if (score >= limit) return { reason: 'nsfw' };
    return { reason: 'ok' };
  } catch (e) {
    console.log(LOG, 'deepai failed', e?.message ?? e);
    return { reason: 'check_failed' };
  }
}

async function classifyWithHuggingFace(base64Jpeg, token, limit) {
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
    console.log(LOG, 'hf scores', rows, 'limit', limit);

    let blockedScore = 0;
    for (const row of rows) {
      if (!isBlockedLabel(row?.label)) continue;
      blockedScore = Math.max(blockedScore, Number(row.score) || 0);
    }

    if (blockedScore >= limit) return { reason: 'nsfw' };

    if (!rows.length) return { reason: 'check_failed' };
    return { reason: 'ok' };
  } catch (e) {
    console.log(LOG, 'hf failed', e?.message ?? e);
    return { reason: 'check_failed' };
  }
}
