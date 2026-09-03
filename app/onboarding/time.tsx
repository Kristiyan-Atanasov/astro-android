// app/onboarding/time.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { mergeOnboardingDraft } from '../../services/onboardingDraft';
import OnboardingHeader from '../../components/OnboardingHeader';
import ScrollWheelPicker from '../../components/ScrollWheelPicker';

const backgroundImg = require('../../assets/images/background.png');
const starsImg = require('../../assets/images/stars.png');

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const val = String(i + 1).padStart(2, '0');
  return { value: val, label: val };
});

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => {
  const val = String(i).padStart(2, '0');
  return { value: val, label: val };
});

const PERIOD_OPTIONS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

function to24Hour(hour12Str: string, minuteStr: string, period: 'AM' | 'PM') {
  const h12 = Math.max(1, Math.min(12, parseInt(hour12Str, 10) || 12));
  const m = Math.max(0, Math.min(59, parseInt(minuteStr, 10) || 0));

  // 12 AM -> 0, 12 PM -> 12, 1..11 PM -> +12
  let h24 = h12 % 12;
  if (period === 'PM') h24 += 12;

  return { birth_hour: h24, birth_minute: m };
}

export default function TimeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');
  const [submitting, setSubmitting] = useState(false);

  const computed = useMemo(
    () => to24Hour(hour, minute, period),
    [hour, minute, period],
  );

  const handleNext = async () => {
    try {
      setSubmitting(true);

      await mergeOnboardingDraft({
        birth_hour: computed.birth_hour,
        birth_minute: computed.birth_minute,
      });

      router.push('/onboarding/location');
    } catch (error: any) {
      console.log('❌ Error saving birth time:', error?.message ?? String(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      setSubmitting(true);

      await mergeOnboardingDraft({
        birth_hour: null,
        birth_minute: null,
      });

      router.push('/onboarding/location');
    } catch (error: any) {
      console.log('❌ Error skipping birth time:', error?.message ?? String(error));
      router.push('/onboarding/location');
    } finally {
      setSubmitting(false);
    }
  };

  const renderAndroidWheels = () => (
    <View style={styles.pickerRow}>
      <View style={styles.pickerColumn}>
        <Text style={styles.pickerLabel}>{t('onboarding.time.hourLabel')}</Text>
        <View style={styles.wheelContainer}>
          <ScrollWheelPicker
            options={HOUR_OPTIONS}
            selectedValue={hour}
            onChange={setHour}
            enabled={!submitting}
          />
        </View>
      </View>

      <View style={styles.pickerColumn}>
        <Text style={styles.pickerLabel}>{t('onboarding.time.minuteLabel')}</Text>
        <View style={styles.wheelContainer}>
          <ScrollWheelPicker
            options={MINUTE_OPTIONS}
            selectedValue={minute}
            onChange={setMinute}
            enabled={!submitting}
          />
        </View>
      </View>

      <View style={styles.pickerColumn}>
        <Text style={styles.pickerLabel}>{t('onboarding.time.periodLabel')}</Text>
        <View style={styles.wheelContainer}>
          <ScrollWheelPicker
            options={PERIOD_OPTIONS}
            selectedValue={period}
            onChange={(v) => setPeriod(v as 'AM' | 'PM')}
            enabled={!submitting}
          />
        </View>
      </View>
    </View>
  );


  return (
    <View style={styles.container}>
      <Image source={backgroundImg} style={styles.bg} resizeMode="cover" />
      <Image source={starsImg} style={styles.stars} resizeMode="cover" />

      <View style={styles.content}>
        <OnboardingHeader
          title={t('onboarding.time.title')}
          step={4}
          onBack={() => router.back()}
          disabled={submitting}
        />

        <Text style={styles.description}>{t('onboarding.time.description')}</Text>

        {renderAndroidWheels()}

        <Text style={styles.info}>{t('onboarding.time.info')}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity disabled={submitting} onPress={handleSkip}>
            <Text style={styles.skipText}>{t('onboarding.time.dontKnow')}</Text>
          </TouchableOpacity>

          <TouchableOpacity disabled={submitting} onPress={handleNext}>
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
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bg: {
    position: 'absolute',
    width,
    height,
    zIndex: -2,
  },
  stars: {
    position: 'absolute',
    width,
    height,
    zIndex: -1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: 'rgba(200, 200, 200, 1)',
    marginBottom: 30,
    fontFamily: 'SFProDisplay-Regular',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 40,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 8,
    textAlign: 'center',
  },
  wheelContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(57, 60, 71, 0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(211, 213, 251, 0.12)',
  },
  info: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'SFProDisplay-Regular',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SFProDisplay-Regular',
  },
  nextButton: {
    height: 60,
    width: 150,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
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
