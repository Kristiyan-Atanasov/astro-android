// app/onboarding/socials.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { mergeOnboardingDraft } from '../../services/onboardingDraft';
import { patchUserProfile } from '../../services/api';
import OnboardingHeader from '../../components/OnboardingHeader';

const bgSocials = require('../../assets/images/bg-socials.png');

export default function SocialScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const saveAndNext = async () => {
    try {
      setSubmitting(true);

      const fb = facebook.trim();
      const ig = instagram.trim();

      await mergeOnboardingDraft({
        social_acc_facebook: fb || '',
        social_acc_instagram: ig || '',
      });

      try {
        await patchUserProfile({
          social_acc_facebook: fb || '',
          social_acc_instagram: ig || '',
        });
      } catch (patchError: any) {
        console.log(
          'ℹ️ Socials patch skipped (profile may not exist yet):',
          patchError?.message ?? String(patchError)
        );
      }

      router.push('/onboarding/vibe');
    } catch (error: any) {
      console.log('❌ Error saving socials:', error?.message ?? String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={bgSocials} style={styles.bg} resizeMode="cover" />

      <OnboardingHeader
        title={t('onboarding.socials.title')}
        onBack={() => router.back()}
        disabled={submitting}
      />

      <Text style={styles.subtitle}>{t('onboarding.socials.subtitle')}</Text>

      <View style={styles.inputWrapper}>
        <View style={styles.inputRow}>
          <Image
            source={require('../../assets/images/signin-graphic.png')}
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder={t('onboarding.socials.facebookPlaceholder')}
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={facebook}
            onChangeText={setFacebook}
            editable={!submitting}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputRow}>
          <Image
            source={require('../../assets/images/signin-graphic.png')}
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder={t('onboarding.socials.instagramPlaceholder')}
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={instagram}
            onChangeText={setInstagram}
            editable={!submitting}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <Text style={styles.infoText}>{t('onboarding.socials.info')}</Text>

      <View style={styles.bottomButtons}>
        <TouchableOpacity disabled={submitting} onPress={saveAndNext}>
          <Text style={styles.skip}>{t('common.skip')}</Text>
        </TouchableOpacity>

        <TouchableOpacity disabled={submitting} onPress={saveAndNext}>
          <LinearGradient
            colors={['rgba(87, 102, 255, 1)', 'rgba(178, 131, 237, 1)']}
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
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    backgroundColor: '#transparent',
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
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: '#ccc',
    marginBottom: 30,
    fontFamily: 'SFProDisplay-Regular',
  },
  inputWrapper: {
    gap: 20,
    marginBottom: 30,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 12,
    resizeMode: 'contain',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SFProDisplay-Regular',
  },
  infoText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    marginBottom: 30,
    fontFamily: 'SFProDisplay-Regular',
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skip: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  nextButton: {
    height: 52,
    paddingHorizontal: 30,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 1,
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
});
