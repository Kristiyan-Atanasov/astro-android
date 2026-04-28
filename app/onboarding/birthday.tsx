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
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { mergeOnboardingDraft } from '../../services/onboardingDraft';

const backgroundImg = require('../../assets/images/background.png');
const starsImg = require('../../assets/images/stars.png');

export default function BirthdayScreen() {
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);

  return (
    <View style={styles.container}>
      <Image source={backgroundImg} style={styles.bg} resizeMode="cover" />
      <Image source={starsImg} style={styles.stars} resizeMode="cover" />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={submitting}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Date of Birth</Text>
        </View>

        <View style={styles.progressWrapper}>
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.step, i <= 1 && styles.activeStep]}
                />
              ))}
            </View>
            <Text style={styles.progressText}>40%</Text>
          </View>
        </View>

        <Text style={styles.description}>
          Date is important for determining your astrology profile
        </Text>

        <View style={styles.pickerWrapper}>
          {Platform.OS === 'ios' && (
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={(_, selectedDate) =>
                selectedDate && setDate(selectedDate)
              }
              style={styles.datePicker}
              textColor="#fff"
            />
          )}
        </View>

        <Text style={styles.info}>
          We use this to generate your AstroInsights wheel. We never share or
          sell your data.
        </Text>

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
              {submitting ? 'Saving...' : 'Next'}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'rgba(57, 60, 71, 0.4)',
    borderRadius: 999,
    padding: 10,
  },
  title: {
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'CooperLtBT-Bold',
  },
  progressWrapper: {
    marginBottom: 30,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBar: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 10,
  },
  step: {
    height: 8,
    flex: 1,
    borderRadius: 4,
    backgroundColor: '#333',
    marginRight: 6,
  },
  activeStep: {
    backgroundColor: 'rgba(87, 124, 251, 1)',
  },
  progressText: {
    fontSize: 12,
    color: '#aaa',
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
