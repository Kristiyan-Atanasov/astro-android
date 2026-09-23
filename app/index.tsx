import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, type ErrorBoundaryProps } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  clearAccessToken,
  getAccessToken,
  getUserProfile,
  isOnboardingComplete,
} from '../services/api';
import {
  authenticateWithBiometric,
  getBiometricLabel,
  isBiometricEnabled,
  isBiometricSupported,
} from '../services/biometric';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>{t('common.somethingWentWrong')}</Text>
      <Text style={styles.errorMessage}>{String(error?.message ?? error)}</Text>

      <TouchableOpacity style={styles.errorButton} onPress={retry}>
        <Text style={styles.errorButtonText}>{t('common.tryAgain')}</Text>
      </TouchableOpacity>
    </View>
  );
}

type LaunchMode = 'checking' | 'locked';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = React.useState<LaunchMode>('checking');
  const [bioLabel, setBioLabel] = React.useState('Face ID');
  const cancelledRef = React.useRef(false);

  // Decide where a signed-in user should land. Returns false when the stored
  // session turns out to be dead (even after a silent refresh), so the caller
  // can fall through to sign-in.
  const routeBySession = React.useCallback(async () => {
    const profile = await getUserProfile();
    if (cancelledRef.current) return true;

    if (isOnboardingComplete(profile)) {
      router.replace('/home');
      return true;
    }
    if (profile) {
      // Resume onboarding from the very first step (language pick).
      router.replace('/onboarding/language');
      return true;
    }

    await clearAccessToken();
    return false;
  }, [router]);

  // Full launch / unlock flow. Also reused by the "Unlock" retry button.
  const runLaunchFlow = React.useCallback(async () => {
    setMode('checking');
    try {
      const token = await getAccessToken();
      if (!token) {
        if (!cancelledRef.current) router.replace('/signin');
        return;
      }

      const biometricsEnabled = await isBiometricEnabled();
      if (biometricsEnabled) {
        const supported = await isBiometricSupported();
        if (supported) {
          const label = await getBiometricLabel();
          if (!cancelledRef.current) setBioLabel(label);

          const { success } = await authenticateWithBiometric(t('lock.prompt'));
          if (cancelledRef.current) return;
          // Don't drop the session — keep them on a lock screen they can retry.
          if (!success) {
            setMode('locked');
            return;
          }
        }
      }

      const routed = await routeBySession();
      if (cancelledRef.current) return;
      if (!routed) router.replace('/signin');
    } catch (e) {
      console.log('Auto-route check failed:', (e as any)?.message ?? String(e));
      if (!cancelledRef.current) router.replace('/signin');
    }
  }, [routeBySession, router, t]);

  React.useEffect(() => {
    cancelledRef.current = false;
    runLaunchFlow();
    return () => {
      cancelledRef.current = true;
    };
  }, [runLaunchFlow]);

  const handleUseDifferentAccount = React.useCallback(async () => {
    await clearAccessToken();
    router.replace('/signin');
  }, [router]);

  if (mode === 'checking') {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (mode === 'locked') {
    return (
      <View style={styles.container}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.planet}
          resizeMode="contain"
        />

        <Text style={styles.title}>{t('lock.title')}</Text>
        <Text style={styles.subtitle}>{t('lock.subtitle')}</Text>

        <TouchableOpacity style={styles.button} onPress={runLaunchFlow}>
          <Text style={styles.buttonText}>
            {t('lock.unlock', { label: bioLabel })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleUseDifferentAccount}>
          <Text style={styles.secondaryLink}>
            {t('lock.useDifferentAccount')}
          </Text>
        </TouchableOpacity>

        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.link}>{t('legalLinks.terms')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.link}>{t('legalLinks.privacy')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/subscription')}>
            <Text style={styles.link}>{t('legalLinks.subscription')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { justifyContent: 'center' }]}>
      <ActivityIndicator color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planet: {
    width: 350,
    height: 350,
    marginTop: 0,
  },
  title: {
    fontSize: 35,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'CooperLtBT-Bold',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#fff',
    marginBottom: 20,
    fontFamily: 'Nunito-Regular',
  },
  button: {
    backgroundColor: '#333',
    width: 328,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  secondaryLink: {
    color: '#ccc',
    fontSize: 14,
    textDecorationLine: 'underline',
    fontFamily: 'Nunito-Regular',
    marginTop: 4,
  },
  linksContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  link: {
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#ccc',
    textDecorationLine: 'underline',
    marginHorizontal: 5,
    fontFamily: 'Nunito-Regular',
  },

  errorContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 12,
  },
  errorMessage: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#333',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 14,
  },
});
