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

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;

        const biometricsEnabled = await isBiometricEnabled();
        if (biometricsEnabled) {
          const supported = await isBiometricSupported();
          if (supported) {
            const { success } = await authenticateWithBiometric(
              'Sign in to Astroinsights',
            );
            if (cancelled) return;
            if (!success) {
              return;
            }
          }
        }

        const profile = await getUserProfile();
        if (cancelled) return;

        if (isOnboardingComplete(profile)) {
          router.replace('/home');
        } else if (profile) {
          // Resume onboarding from the very first step (language pick).
          router.replace('/onboarding/language');
        } else {
          await clearAccessToken();
        }
      } catch (e) {
        console.log('Auto-route check failed:', (e as any)?.message ?? String(e));
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/planet.png')}
        style={styles.planet}
        resizeMode="contain"
      />

      <Text style={styles.title}>{t('welcome.title')}</Text>
      <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/signin')}>
        <Text style={styles.buttonText}>{t('welcome.button')}</Text>
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
