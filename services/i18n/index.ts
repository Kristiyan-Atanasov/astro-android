// services/i18n/index.ts
//
// Single source of truth for the in-app language. We persist the
// chosen language in SecureStore so it survives logout/reinstall
// (when the device keychain is preserved). Defaults to English; the
// user can switch to Bulgarian on the welcome screen or from
// Settings → Language.

import * as SecureStore from 'expo-secure-store';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './translations/en';
import bg from './translations/bg';

export type AppLanguageCode = 'ENGLISH' | 'BULGARIAN';
export type I18nLocale = 'en' | 'bg';

const STORAGE_KEY = 'appLanguage';

export const SUPPORTED_LOCALES: { code: AppLanguageCode; locale: I18nLocale; label: string }[] = [
  { code: 'ENGLISH', locale: 'en', label: 'English' },
  { code: 'BULGARIAN', locale: 'bg', label: 'Български' },
];

export function backendCodeToLocale(code: string | undefined | null): I18nLocale {
  return code === 'BULGARIAN' ? 'bg' : 'en';
}

export function localeToBackendCode(locale: string | undefined | null): AppLanguageCode {
  return locale === 'bg' ? 'BULGARIAN' : 'ENGLISH';
}

// IMPORTANT: i18next must be initialized synchronously, at module-load
// time, BEFORE any component renders. Otherwise the very first render
// of any screen that calls `useTranslation()` happens against an
// uninitialized i18n instance, which (a) logs the
// "You will need to pass in an i18next instance by using
// initReactI18next" warning and (b) returns a different shape of
// hooks/values on the second render — which React then rejects with
// "change in the order of Hooks called". The async SecureStore read
// happens *after* this synchronous bootstrap and only changes the
// language if needed.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      bg: { translation: bg },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    react: { useSuspense: false },
  });
}

let initPromise: Promise<typeof i18n> | null = null;

export function initI18n(): Promise<typeof i18n> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let stored: string | null = null;
    try {
      stored = await SecureStore.getItemAsync(STORAGE_KEY);
    } catch (e) {
      console.log('i18n: stored language read failed:', (e as any)?.message ?? String(e));
    }

    // Default to English unless the user has explicitly picked another
    // supported language before.
    const initial: I18nLocale = stored === 'bg' ? 'bg' : 'en';

    if (i18n.language !== initial) {
      try {
        await i18n.changeLanguage(initial);
      } catch (e) {
        console.log('i18n: changeLanguage failed:', (e as any)?.message ?? String(e));
      }
    }

    return i18n;
  })();

  return initPromise;
}

export async function setAppLocale(locale: I18nLocale): Promise<void> {
  if (locale !== 'en' && locale !== 'bg') return;
  const previous = getAppLocale();
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, locale);
  } catch (e) {
    console.log('i18n: stored language write failed:', (e as any)?.message ?? String(e));
  }
  await i18n.changeLanguage(locale);
  if (previous !== locale) {
    // Daily vibe text comes from the backend in the active language;
    // invalidate any entry cached under the previous language.
    const { clearDailyVibeCache } = await import('../api');
    await clearDailyVibeCache();
  }
}

export function getAppLocale(): I18nLocale {
  const lng = i18n.language;
  return lng === 'bg' ? 'bg' : 'en';
}

export function getAppLanguageCode(): AppLanguageCode {
  return getAppLocale() === 'bg' ? 'BULGARIAN' : 'ENGLISH';
}

// Convenience for non-React modules (e.g. services/api.js) that want to
// know the active language without importing react-i18next.
export { i18n };
