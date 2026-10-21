// Explicit acceptance before public profile content.
// Stored on the device. The profile API has no terms-acceptance field.

import * as SecureStore from 'expo-secure-store';
import { Alert } from '../components/AppAlert';

const KEY = 'astro_public_terms_v1';

export async function hasAcceptedPublicContentTerms() {
  try {
    return (await SecureStore.getItemAsync(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function acceptPublicContentTerms() {
  await SecureStore.setItemAsync(KEY, '1');
}

/**
 * @param {(key: string) => string} t
 * @returns {Promise<true | false | 'terms'>}
 */
export async function ensurePublicContentTerms(t) {
  if (await hasAcceptedPublicContentTerms()) return true;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    Alert.alert(t('publicTerms.title'), t('publicTerms.body'), [
      {
        text: t('publicTerms.notNow'),
        style: 'cancel',
        onPress: () => finish(false),
      },
      {
        text: t('publicTerms.view'),
        onPress: () => finish('terms'),
      },
      {
        text: t('publicTerms.agree'),
        onPress: () => {
          acceptPublicContentTerms()
            .then(() => finish(true))
            .catch(() => finish(false));
        },
      },
    ]);
  });
}
