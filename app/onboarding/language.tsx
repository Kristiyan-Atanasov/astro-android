// app/onboarding/language.tsx
//
// First onboarding step. We force the user to pick the language they
// want Astroinsights to speak with them before anything else, and we
// warn them that this can only be changed later by contacting support.
//
// The selection is applied immediately via `setAppLocale`, so the rest
// of the onboarding flow renders in the chosen language. The language
// will then be persisted to the backend when onboarding completes —
// `app/home.tsx`'s `postOnboarding` retry payload always derives
// `user_settings.language` from `getAppLanguageCode()`.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import OnboardingHeader from '../../components/OnboardingHeader';
import { setAppLocale, type I18nLocale } from '../../services/i18n';

const backgroundImg = require('../../assets/images/background.png');
const starsImg = require('../../assets/images/stars.png');

type LocaleOption = {
  locale: I18nLocale;
  labelKey: 'onboarding.language.english' | 'onboarding.language.bulgarian';
  nativeLabel: string;
};

// Render each option in its own native script so a user who can only
// read one of the two languages can still recognise their option,
// regardless of which language the app currently renders in.
const LOCALE_OPTIONS: LocaleOption[] = [
  { locale: 'en', labelKey: 'onboarding.language.english', nativeLabel: 'English' },
  { locale: 'bg', labelKey: 'onboarding.language.bulgarian', nativeLabel: 'Български' },
];

export default function OnboardingLanguageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const initialLocale: I18nLocale = i18n.language === 'bg' ? 'bg' : 'en';
  const [selected, setSelected] = useState<I18nLocale>(initialLocale);
  const [submitting, setSubmitting] = useState(false);

  // Apply the picked language in-place so the user can immediately see
  // the rest of the screen flip to the new language and confirm it's
  // the one they wanted before committing.
  const handleSelect = async (locale: I18nLocale) => {
    if (submitting || locale === selected) {
      setSelected(locale);
      return;
    }
    setSelected(locale);
    try {
      await setAppLocale(locale);
    } catch (e) {
      console.log('Locale change failed:', (e as any)?.message ?? String(e));
    }
  };

  const proceed = async () => {
    try {
      setSubmitting(true);
      // Make sure the active locale matches the visual selection — in
      // case `handleSelect` was called but never resolved (e.g. the
      // user tapped Continue mid-toggle).
      await setAppLocale(selected);
      router.push('/onboarding/name');
    } catch (e: any) {
      console.log('Onboarding language submit failed:', e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (submitting) return;
    const languageLabel =
      selected === 'bg'
        ? t('onboarding.language.bulgarian')
        : t('onboarding.language.english');
    Alert.alert(
      t('onboarding.language.confirmTitle', { language: languageLabel }),
      t('onboarding.language.confirmBody', { language: languageLabel }),
      [
        { text: t('onboarding.language.confirmCancel'), style: 'cancel' },
        { text: t('onboarding.language.confirmContinue'), onPress: proceed },
      ],
      { cancelable: true },
    );
  };

  return (
    <View style={styles.container}>
      <Image source={backgroundImg} style={styles.bg} resizeMode="cover" />
      <Image source={starsImg} style={styles.stars} resizeMode="cover" />

      <View style={styles.content}>
        <OnboardingHeader
          title={t('onboarding.language.title')}
          step={1}
          onBack={() => router.back()}
          disabled={submitting}
        />

        <Text style={styles.description}>
          {t('onboarding.language.description')}
        </Text>

        <View style={styles.options}>
          {LOCALE_OPTIONS.map((opt) => {
            const active = selected === opt.locale;
            return (
              <TouchableOpacity
                key={opt.locale}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => handleSelect(opt.locale)}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionPrimary}>{opt.nativeLabel}</Text>
                  <Text style={styles.optionSecondary}>{t(opt.labelKey)}</Text>
                </View>
                <View
                  style={[styles.radio, active && styles.radioActive]}
                  pointerEvents="none"
                >
                  {active ? (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.warningBox}>
          <Ionicons
            name="lock-closed-outline"
            size={16}
            color="rgba(255,255,255,0.85)"
            style={styles.warningIcon}
          />
          <Text style={styles.warningText}>
            {t('onboarding.language.warning')}
          </Text>
        </View>

        <View style={styles.flexSpacer} />

        <TouchableOpacity
          disabled={submitting}
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['rgba(178, 131, 237, 1)', 'rgba(87, 124, 251, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.nextButton, submitting && styles.nextButtonDisabled]}
          >
            <Text style={styles.nextText}>
              {submitting ? t('common.saving') : t('common.next')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: {
    position: 'absolute',
    width,
    height,
    top: 0,
    left: 0,
    zIndex: -2,
  },
  stars: {
    position: 'absolute',
    width,
    height,
    top: 0,
    left: 0,
    zIndex: -1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 30,
  },
  description: {
    textAlign: 'center',
    color: 'rgba(200, 200, 200, 1)',
    marginBottom: 30,
    fontSize: 16,
    fontFamily: 'SFProDisplay-Regular',
  },
  options: {
    gap: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 213, 251, 0.2)',
    backgroundColor: 'rgba(57, 102, 255, 0.05)',
  },
  optionActive: {
    borderColor: 'rgba(178, 131, 237, 0.85)',
    backgroundColor: 'rgba(87, 124, 251, 0.18)',
  },
  optionTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  optionPrimary: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'CooperLtBT-Bold',
  },
  optionSecondary: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'SFProDisplay-Regular',
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: 'rgba(178, 131, 237, 1)',
    backgroundColor: 'rgba(178, 131, 237, 1)',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 87, 0.35)',
    backgroundColor: 'rgba(255, 196, 87, 0.08)',
  },
  warningIcon: {
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'SFProDisplay-Regular',
  },
  flexSpacer: {
    flex: 1,
    minHeight: 24,
  },
  nextButton: {
    borderRadius: 30,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
});
