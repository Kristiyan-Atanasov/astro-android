import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, type ErrorBoundaryProps } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
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
import {
  SUPPORTED_LOCALES,
  setAppLocale,
  type I18nLocale,
} from '../services/i18n';

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
  const { t, i18n } = useTranslation();
  const [checking, setChecking] = React.useState(true);
  const [languagePickerVisible, setLanguagePickerVisible] = React.useState(false);

  const currentLocale: I18nLocale = i18n.language === 'bg' ? 'bg' : 'en';
  const currentLabel =
    SUPPORTED_LOCALES.find((l) => l.locale === currentLocale)?.label ?? 'English';

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
          router.replace('/onboarding/name');
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

  const handleLanguageChoice = async (locale: I18nLocale) => {
    setLanguagePickerVisible(false);
    if (locale === currentLocale) return;
    await setAppLocale(locale);
  };

  if (checking) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.languageButton}
        onPress={() => setLanguagePickerVisible(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="globe-outline" size={16} color="#fff" />
        <Text style={styles.languageButtonText}>{currentLabel}</Text>
        <Ionicons name="chevron-down" size={14} color="#fff" />
      </TouchableOpacity>

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

      <Modal
        visible={languagePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguagePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setLanguagePickerVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('language.title')}</Text>
            {SUPPORTED_LOCALES.map((opt) => {
              const active = opt.locale === currentLocale;
              return (
                <TouchableOpacity
                  key={opt.locale}
                  style={[styles.modalOption, active && styles.modalOptionActive]}
                  onPress={() => handleLanguageChoice(opt.locale)}
                >
                  <Text style={styles.modalOptionText}>{opt.label}</Text>
                  {active ? (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
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
  languageButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 5,
  },
  languageButtonText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1B1F2E',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(140,140,200,0.18)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'CooperLtBT-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(87, 124, 251, 0.18)',
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'SFProDisplay-Regular',
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
