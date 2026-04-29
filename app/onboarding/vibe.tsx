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
import { LinearGradient } from 'expo-linear-gradient';

import { postOnboarding, getDailyVibe } from '../../services/api';
import { getOnboardingDraft, clearOnboardingDraft } from '../../services/onboardingDraft';

const vibeBg = require('../../assets/images/vibe-bg.png');
const vibeIcon = require('../../assets/images/vibe-icon.png');

export default function VibeScreen() {
  const router = useRouter();
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

  const onContinue = async () => {
    try {
      setSubmitting(true);

      const draft = await getOnboardingDraft();
      console.log('🧾 onboarding draft:', draft);

      if (!draft?.name) {
        Alert.alert('Missing info', 'Please enter your name first.');
        return;
      }
      if (!draft?.birth_date) {
        Alert.alert('Missing info', 'Please enter your date of birth first.');
        return;
      }

      // Backend's TimeField needs HH:MM:SS, IntegerField needs a real
      // integer (not null), so we always provide valid defaults.
      const birthHour =
        typeof draft.birth_hour === 'number' ? draft.birth_hour : 12;
      const birthMinute =
        typeof draft.birth_minute === 'number' ? draft.birth_minute : 0;

      const payload: Record<string, any> = {
        name: String(draft.name),
        birth_date: String(draft.birth_date),
        birth_hour: birthHour,
        birth_minute: birthMinute,
        birth_city: draft.birth_city ? String(draft.birth_city) : 'Unknown',
        social_acc_instagram: draft.social_acc_instagram
          ? String(draft.social_acc_instagram)
          : '',
        social_acc_facebook: draft.social_acc_facebook
          ? String(draft.social_acc_facebook)
          : '',
        user_settings: {
          allow_notifications: true,
          language: 'ENGLISH',
          reminder_count: 1,
          reminder_time_start: '09:00:00',
          reminder_time_end: '21:00:00',
          ...(draft.user_settings ?? {}),
        },
      };

      console.log('📤 onboarding payload:', payload);

      const res = await postOnboarding(payload);
      console.log('✅ onboarding success response:', res);

      await clearOnboardingDraft();
      router.replace('/onboarding/notifications');
    } catch (e: any) {
      console.log('❌ onboarding submit error:', e?.message ?? String(e));
      Alert.alert(
        'Onboarding failed',
        e?.message
          ? `${e.message}\n\nYou can continue and we’ll retry in the background, or try again now.`
          : 'Something went wrong.',
        [
          { text: 'Try again', style: 'cancel' },
          {
            text: 'Continue anyway',
            onPress: () => router.replace('/onboarding/notifications'),
          },
        ],
      );
    } finally {
      setSubmitting(false);
    }
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
            <Text style={styles.cardTitle}>Your daily vibe</Text>
          </View>

          <Text style={styles.cardQuote}>
            {dailyVibe
              ? `“${dailyVibe}”`
              : '“Loading your daily vibe…”'}
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
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={submitting} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ActivityIndicator color="#B283ED" size="large" />
            <Text style={styles.modalTitle}>Calculating your chart…</Text>
            <Text style={styles.modalSubtitle}>
              We’re asking the stars a few questions. This can take up to a
              minute the first time.
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
