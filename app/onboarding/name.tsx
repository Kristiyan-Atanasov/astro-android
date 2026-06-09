// app/onboarding/name.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { mergeOnboardingDraft } from '../../services/onboardingDraft';
import OnboardingHeader from '../../components/OnboardingHeader';

const backgroundImg = require('../../assets/images/background.png');
const starsImg = require('../../assets/images/stars.png');

export default function NameScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image source={backgroundImg} style={styles.bg} resizeMode="cover" />
      <Image source={starsImg} style={styles.stars} resizeMode="cover" />

      <View style={styles.content}>
        <OnboardingHeader
          title={t('onboarding.name.title')}
          step={2}
          onBack={() => router.back()}
          disabled={submitting}
        />

        <Text style={styles.description}>{t('onboarding.name.description')}</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('onboarding.name.placeholder')}
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          style={styles.input}
          editable={!submitting}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="done"
        />

        <Text style={styles.info}>{t('onboarding.name.info')}</Text>

        <TouchableOpacity
          disabled={submitting || !name.trim()}
          onPress={async () => {
            try {
              setSubmitting(true);

              await mergeOnboardingDraft({ name: name.trim() });

              router.push('/onboarding/birthday');
            } catch (error: any) {
              console.log('❌ Error saving name:', error?.message ?? String(error));
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <LinearGradient
            colors={['rgba(178, 131, 237, 1)', 'rgba(87, 124, 251, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.nextButton,
              (submitting || !name.trim()) && styles.nextButtonDisabled,
            ]}
          >
            <Text style={styles.nextText}>
              {submitting ? t('common.saving') : t('common.next')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  },
  description: {
    textAlign: 'center',
    color: 'rgba(200, 200, 200, 1)',
    marginBottom: 30,
    fontSize: 16,
    fontFamily: 'SFProDisplay-Regular',
  },
  input: {
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(212, 213, 251, 0.2)',
    paddingHorizontal: 25,
    color: '#fff',
    marginBottom: 20,
    fontFamily: 'SFProDisplay-Regular',
    backgroundColor: 'rgba(57, 102, 255, 0.05)',
    fontSize: 20,
  },
  info: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'SFProDisplay-Regular',
  },
  nextButton: {
    borderRadius: 30,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
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
