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
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { mergeOnboardingDraft } from '../../services/onboardingDraft';
import OnboardingHeader from '../../components/OnboardingHeader';

const backgroundImg = require('../../assets/images/background.png');
const starsImg = require('../../assets/images/stars.png');

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
  const [hour, setHour] = useState('8');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');
  const [submitting, setSubmitting] = useState(false);

  const computed = useMemo(
    () => to24Hour(hour, minute, period),
    [hour, minute, period]
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

      // If user doesn't know, store nulls (only if your final submit allows nulls).
      // Alternatively remove these lines and just navigate without saving.
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

  return (
    <View style={styles.container}>
      <Image source={backgroundImg} style={styles.bg} resizeMode="cover" />
      <Image source={starsImg} style={styles.stars} resizeMode="cover" />

      <View style={styles.content}>
        <OnboardingHeader
          title="Birth of Time"
          step={3}
          onBack={() => router.back()}
          disabled={submitting}
        />

        <Text style={styles.description}>
          Time is important for determining your houses,{'\n'}
          rising sign, and exact moon position.
        </Text>

        <View style={styles.pickerRow}>
          <Picker
            selectedValue={hour}
            style={styles.picker}
            onValueChange={setHour}
            itemStyle={styles.pickerItem}
            enabled={!submitting}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const val = (i + 1).toString();
              return <Picker.Item key={val} label={val} value={val} />;
            })}
          </Picker>

          <Picker
            selectedValue={minute}
            style={styles.picker}
            onValueChange={setMinute}
            itemStyle={styles.pickerItem}
            enabled={!submitting}
          >
            {Array.from({ length: 60 }, (_, i) => {
              const val = String(i).padStart(2, '0');
              return <Picker.Item key={val} label={val} value={val} />;
            })}
          </Picker>

          <Picker
            selectedValue={period}
            style={styles.picker}
            onValueChange={(v) => setPeriod(v)}
            itemStyle={styles.pickerItem}
            enabled={!submitting}
          >
            <Picker.Item label="AM" value="AM" />
            <Picker.Item label="PM" value="PM" />
          </Picker>
        </View>

        <Text style={styles.info}>
          We use this to generate your AstroInsights{'\n'}
          wheel. We never share or sell your data.
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity disabled={submitting} onPress={handleSkip}>
            <Text style={styles.skipText}>I don’t know</Text>
          </TouchableOpacity>

          <TouchableOpacity disabled={submitting} onPress={handleNext}>
            <LinearGradient
              colors={['rgba(178, 131, 237, 1)', 'rgba(87, 124, 251, 1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.nextButton, submitting && styles.nextButtonDisabled]}
            >
              <Text style={styles.nextText}>{submitting ? 'Saving...' : 'Next'}</Text>
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
    justifyContent: 'space-evenly',
    marginBottom: 40,
  },
  picker: {
    width: 100,
    height: 160,
  },
  pickerItem: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'SFProDisplay-Regular',
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
