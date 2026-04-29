// app/onboarding/birthday.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { mergeOnboardingDraft } from '../../services/onboardingDraft';
import OnboardingHeader from '../../components/OnboardingHeader';

const backgroundImg = require('../../assets/images/background.png');
const starsImg = require('../../assets/images/stars.png');

export default function BirthdayScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  const formatDate = (d: Date) =>
    d.toLocaleDateString(i18n.language === 'bg' ? 'bg-BG' : undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return (
    <View style={styles.container}>
      <Image source={backgroundImg} style={styles.bg} resizeMode="cover" />
      <Image source={starsImg} style={styles.stars} resizeMode="cover" />

      <View style={styles.content}>
        <OnboardingHeader
          title={t('onboarding.birthday.title')}
          step={2}
          onBack={() => router.back()}
          disabled={submitting}
        />

        <Text style={styles.description}>{t('onboarding.birthday.description')}</Text>

        <View style={styles.pickerWrapper}>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={(_, selectedDate) =>
                selectedDate && setDate(selectedDate)
              }
              style={styles.datePicker}
              textColor="#fff"
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.androidDateButton}
                onPress={() => setShowAndroidPicker(true)}
                disabled={submitting}
              >
                <Text style={styles.androidDateText}>{formatDate(date)}</Text>
              </TouchableOpacity>

              {showAndroidPicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowAndroidPicker(false);
                    if (event.type === 'set' && selectedDate) {
                      setDate(selectedDate);
                    }
                  }}
                />
              )}
            </>
          )}
        </View>

        <Text style={styles.info}>{t('onboarding.birthday.info')}</Text>

        <TouchableOpacity
          disabled={submitting}
          onPress={async () => {
            try {
              setSubmitting(true);

              const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
              await mergeOnboardingDraft({ birth_date: formattedDate });

              router.push('/onboarding/time');
            } catch (error: any) {
              console.log(
                '❌ Error saving birth date:',
                error?.message ?? String(error)
              );
            } finally {
              setSubmitting(false);
            }
          }}
        >
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
  pickerWrapper: {
    marginBottom: 20,
  },
  datePicker: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  androidDateButton: {
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(212, 213, 251, 0.2)',
    backgroundColor: 'rgba(57, 102, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidDateText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'SFProDisplay-Regular',
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
    opacity: 0.7,
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
});
