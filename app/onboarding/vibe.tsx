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

      // If name isn’t in the draft, final submit will fail with {"name":["This field is required."]}
      if (!draft?.name) {
        Alert.alert('Missing info', 'Please enter your name first.');
        // If your name screen path differs, change this:
        // router.push('/onboarding/name');
        return;
      }

      const payload = {
        name: String(draft.name),
        birth_date: draft.birth_date ? String(draft.birth_date) : null,
        birth_hour: draft.birth_hour === undefined ? null : draft.birth_hour,
        birth_minute: draft.birth_minute === undefined ? null : draft.birth_minute,
        birth_city: draft.birth_city ? String(draft.birth_city) : null,
        social_acc_instagram: draft.social_acc_instagram ? String(draft.social_acc_instagram) : '',
        social_acc_facebook: draft.social_acc_facebook ? String(draft.social_acc_facebook) : '',
        user_settings: draft.user_settings ?? {
          allow_notifications: true,
          language: 'ENGLISH',
          reminder_count: 1,
          reminder_time_start: '09:00',
          reminder_time_end: '21:00',
        },
      };

      const res = await postOnboarding(payload);
      console.log('✅ onboarding success response:', res);

      await clearOnboardingDraft();
      router.replace('/onboarding/notifications');
    } catch (e: any) {
      console.log('❌ onboarding submit error:', e?.message ?? String(e));
      Alert.alert('Onboarding failed', e?.message ?? String(e));
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
          <Text style={styles.buttonText}>{submitting ? 'Submitting...' : 'Continue'}</Text>
        </LinearGradient>
      </TouchableOpacity>
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
});
