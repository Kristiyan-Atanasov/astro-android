// app/onboarding/notifications.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserProfile, patchUserProfile } from '../../services/api';
import {
  clearRegisteredToken,
  ensureNotificationPermission,
  registerForPushNotifications,
} from '../../services/notifications';

const notificationImg = require('../../assets/images/notification-image.png');

// Persists `allow_notifications` to the backend without overwriting any
// other settings the user already has.
async function persistAllowNotifications(allow: boolean) {
  let baseSettings: Record<string, any> = {
    allow_notifications: allow,
    language: 'ENGLISH',
    reminder_count: 1,
    reminder_time_start: '09:00:00',
    reminder_time_end: '21:00:00',
  };

  try {
    const profile: any = await getUserProfile();
    if (profile?.user_settings && typeof profile.user_settings === 'object') {
      baseSettings = { ...baseSettings, ...profile.user_settings };
    }
  } catch (e) {
    console.log(
      'Notif preflight profile fetch failed:',
      (e as any)?.message ?? String(e),
    );
  }

  await patchUserProfile({
    user_settings: {
      ...baseSettings,
      allow_notifications: allow,
    },
  });
}

export default function OnboardingNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [working, setWorking] = useState(false);

  const goHome = () => {
    router.replace('/home');
  };

  const handleEnable = async () => {
    try {
      setWorking(true);
      const perm = await ensureNotificationPermission();
      if (perm.granted) {
        await registerForPushNotifications();
        await persistAllowNotifications(true);
      } else {
        // OS denied → there's no way to actually deliver notifications,
        // so reflect that on the backend instead of leaving stale state.
        await persistAllowNotifications(false);
      }
    } catch (e) {
      console.log(
        'Onboarding notif enable failed:',
        (e as any)?.message ?? String(e),
      );
    } finally {
      setWorking(false);
      goHome();
    }
  };

  const handleSkip = async () => {
    try {
      setWorking(true);
      await persistAllowNotifications(false);
      await clearRegisteredToken();
    } catch (e) {
      console.log(
        'Onboarding notif skip failed:',
        (e as any)?.message ?? String(e),
      );
    } finally {
      setWorking(false);
      goHome();
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Accept push Notification</Text>
          <Ionicons
            name="sparkles"
            size={16}
            color="#fff"
            style={styles.titleSparkle}
          />
        </View>

        <Text style={styles.subtitle}>
          Find out when friends add you{'\n'}
          and know exactly what you should expect each day
        </Text>

        <Image
          source={notificationImg}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          onPress={handleEnable}
          disabled={working}
          activeOpacity={0.9}
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={['#577CFB', '#B283ED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.cta, working && styles.ctaDisabled]}
          >
            {working ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Turn on notifications</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          disabled={working}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          style={styles.skipHit}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 30,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
    fontSize: 22,
    textAlign: 'center',
  },
  titleSparkle: {
    marginLeft: 8,
  },
  subtitle: {
    color: '#FFFFFF',
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.85,
  },
  image: {
    width: width - 80,
    height: width * 0.95,
    maxHeight: 380,
  },
  bottom: {
    width: '100%',
    alignItems: 'center',
  },
  ctaWrap: {
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 18,
  },
  cta: {
    height: 60,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  skipHit: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    color: '#fff',
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
  },
});
