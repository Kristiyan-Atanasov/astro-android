// app/onboarding/vibe.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

import { postOnboarding, getDailyVibe } from '../../services/api';
import { getOnboardingDraft, clearOnboardingDraft } from '../../services/onboardingDraft';
import { getAppLanguageCode } from '../../services/i18n';

const vibeBg = require('../../assets/images/vibe-bg.png');
const vibeIcon = require('../../assets/images/vibe-icon.png');

export default function VibeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [dailyVibe, setDailyVibe] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vibe = await getDailyVibe();
        if (cancelled) return;
        const text = (vibe as any)?.text;
        if (typeof text === 'string' && text.trim().length > 0) {
          setDailyVibe(text.trim());
        }
      } catch (e) {
        console.log('Vibe load failed:', (e as any)?.message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildPayload = (
    draft: Record<string, any>,
    overrideCity?: string,
  ): Record<string, any> => {
    const birthHour =
      typeof draft.birth_hour === 'number' ? draft.birth_hour : 12;
    const birthMinute =
      typeof draft.birth_minute === 'number' ? draft.birth_minute : 0;

    const cityValue = overrideCity ?? (draft.birth_city ? String(draft.birth_city) : 'Unknown');

    const payload: Record<string, any> = {
      name: String(draft.name),
      birth_date: String(draft.birth_date),
      birth_hour: birthHour,
      birth_minute: birthMinute,
      birth_city: cityValue,
      social_acc_instagram: draft.social_acc_instagram
        ? String(draft.social_acc_instagram)
        : '',
      social_acc_facebook: draft.social_acc_facebook
        ? String(draft.social_acc_facebook)
        : '',
      user_settings: {
        allow_notifications: false,
        reminder_count: 1,
        reminder_time_start: '09:00:00',
        reminder_time_end: '21:00:00',
        ...(draft.user_settings ?? {}),
        // Always trust the active app language; ignore any older value
        // that may have been written into the draft.
        language: getAppLanguageCode(),
      },
    };

    // If the city picker captured coordinates, forward them under the
    // most common backend field names. The backend will use whichever
    // it knows about and silently ignore the rest. We only do this when
    // we're submitting the originally selected city — if the user falls
    // back to "Bulgaria" the lat/lng would be misleading, so we drop them.
    if (!overrideCity) {
      const lat =
        typeof draft.birth_city_latitude === 'number'
          ? draft.birth_city_latitude
          : null;
      const lng =
        typeof draft.birth_city_longitude === 'number'
          ? draft.birth_city_longitude
          : null;
      if (lat !== null && lng !== null) {
        payload.birth_city_latitude = lat;
        payload.birth_city_longitude = lng;
        payload.birth_latitude = lat;
        payload.birth_longitude = lng;
        payload.latitude = lat;
        payload.longitude = lng;
      }
      if (draft.birth_city_country) {
        payload.birth_city_country = String(draft.birth_city_country);
        payload.birth_country = String(draft.birth_city_country);
      }
      if (draft.birth_city_country_code) {
        payload.birth_city_country_code = String(draft.birth_city_country_code);
      }
    }

    return payload;
  };

  const finishAndGoNext = async () => {
    try {
      await clearOnboardingDraft();
    } catch (e) {
      console.log(
        'Clear onboarding draft failed:',
        (e as any)?.message ?? String(e),
      );
    }
    router.replace('/onboarding/notifications');
  };

  const submitOnboarding = async (overrideCity?: string) => {
    setSubmitting(true);
    try {
      const draft = await getOnboardingDraft();
      console.log('🧾 onboarding draft:', draft);

      if (!draft?.name) {
        Alert.alert(
          t('onboarding.location.missingInfoTitle'),
          t('onboarding.location.missingName'),
        );
        return;
      }
      if (!draft?.birth_date) {
        Alert.alert(
          t('onboarding.location.missingInfoTitle'),
          t('onboarding.location.missingBirthDate'),
        );
        return;
      }

      const payload = buildPayload(draft, overrideCity);
      console.log('📤 onboarding payload:', payload);

      try {
        const res = await postOnboarding(payload);
        console.log('✅ onboarding success response:', res);
        await finishAndGoNext();
        return;
      } catch (innerErr: any) {
        const isTransient = innerErr?.code === 'transient-error';
        const country: string | undefined =
          typeof draft?.birth_city_country === 'string'
            ? draft.birth_city_country
            : undefined;

        // Backend's geocoder failed for the picked city — silently fall
        // back to the country (which always geocodes cleanly) before
        // bothering the user with an alert. We only do this once, and
        // only if we haven't already tried the country.
        if (
          isTransient &&
          country &&
          country !== overrideCity &&
          country !== draft?.birth_city
        ) {
          console.log(
            `🔁 Geocoder failed for "${draft?.birth_city}", retrying with country "${country}"…`,
          );
          const fallbackPayload = buildPayload(draft, country);
          try {
            const res = await postOnboarding(fallbackPayload);
            console.log('✅ onboarding success (country fallback):', res);
            await finishAndGoNext();
            return;
          } catch (fallbackErr: any) {
            // Country also failed — fall through to the user-facing alert
            // below.
            console.log(
              '❌ country fallback also failed:',
              fallbackErr?.message ?? String(fallbackErr),
            );
          }
        }

        throw innerErr;
      }
    } catch (e: any) {
      console.log('❌ onboarding submit error:', e?.message ?? String(e));

      const isTransient = e?.code === 'transient-error';

      const title = isTransient
        ? t('onboarding.location.lookupFailedTitle')
        : t('onboarding.location.onboardingFailedTitle');

      const message = isTransient
        ? t('onboarding.location.lookupFailedBody')
        : e?.message
          ? `${e.message}`
          : t('common.somethingWentWrong');

      Alert.alert(title, message, [
        { text: t('common.tryAgain'), style: 'cancel' },
        {
          text: t('common.continueAnyway'),
          onPress: () => finishAndGoNext(),
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const onContinue = () => {
    submitOnboarding();
  };

  return (
    <View style={styles.container}>
      <Image source={vibeBg} style={styles.bg} resizeMode="cover" />

      {/* Shadow wrapper (solid bg to avoid iOS shadow warning) */}
      <View style={styles.cardShadow}>
        {/* Inner translucent card (no shadow here) */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Image source={vibeIcon} style={styles.vibeIcon} />
            <Text style={styles.cardTitle}>{t('onboarding.vibe.title')}</Text>
          </View>

          <Text style={styles.cardQuote}>
            {dailyVibe ? `“${dailyVibe}”` : t('onboarding.vibe.loading')}
          </Text>

          <View style={styles.cardBar} />
          <View style={styles.cardBar} />
          <View style={styles.cardBar} />
        </View>
      </View>

      <TouchableOpacity disabled={submitting} onPress={onContinue}>
        <LinearGradient
          colors={['rgba(87, 102, 255, 1)', 'rgba(178, 131, 237, 1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, submitting && styles.buttonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('onboarding.vibe.continue')}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={submitting} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ActivityIndicator color="#B283ED" size="large" />
            <Text style={styles.modalTitle}>{t('onboarding.vibe.calculatingTitle')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('onboarding.vibe.calculatingSubtitle')}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    position: 'relative',
  },
  bg: {
    position: 'absolute',
    width,
    height,
    top: 0,
    left: 0,
    zIndex: -1,
  },

  // Solid background + shadow lives here (prevents iOS warning) [web:640][web:647]
  cardShadow: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#0B0F1A', // solid
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },

  // Translucent overlay lives here (no shadow)
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
  },

  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  vibeIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    resizeMode: 'contain',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'CooperLtBT-Bold',
  },
  cardQuote: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 30,
    fontFamily: 'SFProDisplay-Regular',
  },
  cardBar: {
    marginTop: 8,
    height: 2,
    width: 24,
    borderRadius: 2,
    backgroundColor: '#00AEEF',
    alignSelf: 'center',
  },

  button: {
    height: 60,
    width: width - 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    opacity: 1,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 10, 22, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1B1F2E',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(140, 140, 200, 0.18)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'CooperLtBT-Bold',
    marginTop: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#9C9CA6',
    fontSize: 13,
    fontFamily: 'SFProDisplay-Regular',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
});
