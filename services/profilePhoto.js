// services/profilePhoto.js
// Profile avatar: pick from library, safety-check, persist on device.

import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { moderateProfileImage } from './moderateImage';

const LOG = '[ProfilePhoto]';
const URI_KEY = 'profile_photo_uri';
const PHOTO_DIR = `${FileSystem.documentDirectory}profile-photos/`;
const PHOTO_FILE = `${PHOTO_DIR}avatar.jpg`;

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

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

export async function getProfilePhotoUri() {
  try {
    const stored = await SecureStore.getItemAsync(URI_KEY);
    if (!stored) return null;
    const info = await FileSystem.getInfoAsync(stored);
    if (!info.exists) {
      await SecureStore.deleteItemAsync(URI_KEY);
      return null;
    }
    return stored;
  } catch (e) {
    console.log(LOG, 'get failed', e?.message ?? e);
    return null;
  }
}

export async function clearProfilePhoto() {
  try {
    const info = await FileSystem.getInfoAsync(PHOTO_FILE);
    if (info.exists) {
      await FileSystem.deleteAsync(PHOTO_FILE, { idempotent: true });
    }
    await SecureStore.deleteItemAsync(URI_KEY);
    console.log(LOG, 'cleared avatar');
  } catch (e) {
    console.log(LOG, 'clear failed', e?.message ?? e);
  }
}

async function persistUri(fromUri) {
  await ensureDir();
  await FileSystem.copyAsync({ from: fromUri, to: PHOTO_FILE });
  await SecureStore.setItemAsync(URI_KEY, PHOTO_FILE);
  return `${PHOTO_FILE}?t=${Date.now()}`;
}

/**
 * Opens the system photo library, safety-checks the image, then saves it.
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
    if (mime && !mime.startsWith('image/')) {
      return { ok: false, reason: 'invalid' };
    }
    if (mime.includes('gif') || mime.includes('svg')) {
      return { ok: false, reason: 'invalid' };
    }

    const moderation = await moderateProfileImage(asset.uri);
    if (!moderation.ok) {
      return { ok: false, reason: moderation.reason || 'nsfw' };
    }

    const uri = await persistUri(asset.uri);
    console.log(LOG, 'saved avatar');
    return { ok: true, uri };
  } catch (e) {
    console.log(LOG, 'pick failed', e?.message ?? e);
    if (isNativePickerMissing(e)) return { ok: false, reason: 'needs_rebuild' };
    return { ok: false, reason: 'failed' };
  }
}
