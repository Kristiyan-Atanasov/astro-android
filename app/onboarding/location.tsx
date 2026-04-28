// app/onboarding/location.tsx
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { mergeOnboardingDraft } from '../../services/onboardingDraft';

const backgroundImg = require('../../assets/images/background.png');
const starsImg = require('../../assets/images/stars.png');

export default function LocationScreen() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          <Text style={styles.title}>Birth Location</Text>
        </View>

        <View style={styles.progressWrapper}>
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={[styles.step, i <= 3 && styles.activeStep]} />
              ))}
            </View>
            <Text style={styles.progressText}>80%</Text>
          </View>
        </View>

        <Text style={styles.description}>
          Location is important for calculating time zones and precise coordinates.
        </Text>

        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Enter your birth location"
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          style={styles.input}
          editable={!submitting}
        />

        <Text style={styles.info}>
          We use this to generate your AstroInsights wheel. We never share or sell your data.
        </Text>

        <TouchableOpacity
          disabled={submitting || !location.trim()}
          onPress={async () => {
            try {
              setSubmitting(true);

              await mergeOnboardingDraft({
                birth_city: location.trim(),
              });

              router.push('/onboarding/socials');
            } catch (error: any) {
              console.log('❌ Error saving birth city:', error?.message ?? String(error));
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
              (submitting || !location.trim()) && styles.nextButtonDisabled,
            ]}
          >
            <Text style={styles.nextText}>{submitting ? 'Saving...' : 'Next'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    opacity: 0.7,
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
});
