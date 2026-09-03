// services/profilePhoto.js
// Profile avatar: pick from library, safety-check, upload to backend.
// Signed S3 URLs expire — never persist them; refresh from profile APIs.

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as SecureStore from 'expo-secure-store';
import {
  deleteProfilePicture,
  uploadProfilePicture,
} from './api';
import { moderateProfileImage } from './moderateImage';

const LOG = '[ProfilePhoto]';
const LEGACY_URI_KEY = 'profile_photo_uri';
const LEGACY_PHOTO_DIR = `${FileSystem.documentDirectory}profile-photos/`;
const LEGACY_PHOTO_FILE = `${LEGACY_PHOTO_DIR}avatar.jpg`;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function loadImagePicker() {
  try {
    return require('expo-image-picker');
  } catch (e) {
    console.log(LOG, 'image picker unavailable', e?.message ?? e);
    return null;
  }
}

function isNativePickerMissing(error) {
  const message = String(error?.message ?? error ?? '');
  return (
    message.includes('ExponentImagePicker') ||
    message.includes('Cannot find native module')
  );
}

function guessMime(uri, mimeType) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'image/jpeg';
  if (mime === 'image/png') return 'image/png';
  if (mime === 'image/webp') return 'image/webp';
  if (mime.includes('heic') || mime.includes('heif')) return 'image/heic';

  const lower = String(uri || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return mime || 'image/jpeg';
}

function needsJpegConversion(mime) {
  return (
    mime === 'image/heic' ||
    mime === 'image/heif' ||
    mime.includes('heic') ||
    mime.includes('heif') ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(mime)
  );
}

async function clearLegacyLocalPhoto() {
  try {
    const info = await FileSystem.getInfoAsync(LEGACY_PHOTO_FILE);
    if (info.exists) {
      await FileSystem.deleteAsync(LEGACY_PHOTO_FILE, { idempotent: true });
    }
    await SecureStore.deleteItemAsync(LEGACY_URI_KEY);
  } catch {
    // ignore
  }
}

/**
 * Drop any leftover on-device avatar cache from before backend storage.
 * Signed URLs must never be stored permanently.
 */
export async function clearProfilePhoto() {
  await clearLegacyLocalPhoto();
}

/**
 * @deprecated Prefer profile.profile_picture_url from the API.
 * Clears legacy local files and returns null.
 */
export async function getProfilePhotoUri() {
  await clearLegacyLocalPhoto();
  return null;
}

async function prepareUploadFile(asset) {
  const sourceUri = asset?.uri;
  if (!sourceUri) return { ok: false, reason: 'invalid' };

  const mime = guessMime(sourceUri, asset.mimeType);
  if (mime.includes('gif') || mime.includes('svg')) {
    return { ok: false, reason: 'invalid' };
  }

  let uploadUri = sourceUri;
  let uploadMime = mime;
  let uploadName = 'avatar.jpg';

  if (needsJpegConversion(mime) || mime === 'image/jpeg') {
    // Always normalize HEIC (and odd formats) to JPEG. Mild recompress for
    // JPEG keeps most photos under the 5MB backend cap.
    const converted = await ImageManipulator.manipulateAsync(
      sourceUri,
      [],
      {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    uploadUri = converted.uri;
    uploadMime = 'image/jpeg';
    uploadName = 'avatar.jpg';
  } else if (mime === 'image/png') {
    uploadName = 'avatar.png';
  } else if (mime === 'image/webp') {
    uploadName = 'avatar.webp';
  }

  const info = await FileSystem.getInfoAsync(uploadUri, { size: true });
  if (!info.exists) return { ok: false, reason: 'invalid' };
  if (typeof info.size === 'number' && info.size > MAX_UPLOAD_BYTES) {
    // One more pass at stronger compression for oversized JPEG candidates.
    if (uploadMime === 'image/jpeg' || needsJpegConversion(mime)) {
      const smaller = await ImageManipulator.manipulateAsync(
        sourceUri,
        [{ resize: { width: 1600 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );
      const smallerInfo = await FileSystem.getInfoAsync(smaller.uri, {
        size: true,
      });
      if (
        typeof smallerInfo.size === 'number' &&
        smallerInfo.size > MAX_UPLOAD_BYTES
      ) {
        return { ok: false, reason: 'too_large' };
      }
      uploadUri = smaller.uri;
      uploadMime = 'image/jpeg';
      uploadName = 'avatar.jpg';
    } else {
      return { ok: false, reason: 'too_large' };
    }
  }

  return {
    ok: true,
    file: {
      uri: uploadUri,
      name: uploadName,
      type: uploadMime,
    },
  };
}

function mapUploadError(error) {
  const status = error?.status;
  const message = String(error?.message ?? '').toLowerCase();
  if (status === 413 || message.includes('too large') || message.includes('5')) {
    return 'too_large';
  }
  if (
    status === 400 ||
    message.includes('invalid') ||
    message.includes('format') ||
    message.includes('unsupported')
  ) {
    return 'invalid';
  }
  if (message.includes('network')) return 'failed';
  if (message.includes('session expired') || message.includes('sign in')) {
    return 'failed';
  }
  return 'failed';
}

/**
 * Opens the system photo library, safety-checks the image, uploads it, and
 * returns the refreshed profile (including a signed profile_picture_url).
 */
export async function pickAndSaveProfilePhoto() {
  const ImagePicker = loadImagePicker();
  if (!ImagePicker) return { ok: false, reason: 'needs_rebuild' };

  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'permission' };

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      exif: false,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return { ok: false, reason: 'cancelled' };
    }

    const asset = result.assets[0];
    const mime = String(asset.mimeType || '').toLowerCase();
    if (mime && !mime.startsWith('image/') && !mime.includes('heic')) {
      return { ok: false, reason: 'invalid' };
    }
    if (mime.includes('gif') || mime.includes('svg')) {
      return { ok: false, reason: 'invalid' };
    }

    const prepared = await prepareUploadFile(asset);
    if (!prepared.ok) return { ok: false, reason: prepared.reason || 'invalid' };

    const moderation = await moderateProfileImage(prepared.file.uri);
    if (!moderation.ok) {
      return { ok: false, reason: moderation.reason || 'nsfw' };
    }

    const profile = await uploadProfilePicture(prepared.file);
    await clearLegacyLocalPhoto();

    const uri =
      typeof profile?.profile_picture_url === 'string' &&
      profile.profile_picture_url.trim()
        ? profile.profile_picture_url.trim()
        : null;

    console.log(LOG, 'uploaded avatar', { hasUrl: Boolean(uri) });
    return { ok: true, uri, profile };
  } catch (e) {
    console.log(LOG, 'pick/upload failed', e?.message ?? e);
    if (isNativePickerMissing(e)) return { ok: false, reason: 'needs_rebuild' };
    return { ok: false, reason: mapUploadError(e) };
  }
}

/**
 * Deletes the avatar on the backend and returns the refreshed profile.
 */
export async function removeProfilePhoto() {
  try {
    const profile = await deleteProfilePicture();
    await clearLegacyLocalPhoto();
    console.log(LOG, 'deleted avatar');
    return { ok: true, uri: null, profile };
  } catch (e) {
    console.log(LOG, 'delete failed', e?.message ?? e);
    return { ok: false, reason: mapUploadError(e) };
  }
}
