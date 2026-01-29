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

const backgroundImg = require('../../assets/images/background.png');
const starsImg = require('../../assets/images/stars.png');

export default function BirthdayScreen() {
  const router = useRouter();
  const [date, setDate] = useState(new Date());

  return (
    <View style={styles.container}>
      {/* Background */}
      <Image source={backgroundImg} style={styles.bg} resizeMode="cover" />
      <Image source={starsImg} style={styles.stars} resizeMode="cover" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Date of Birth</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={[styles.step, i <= 1 && styles.activeStep]} />
              ))}
            </View>
            <Text style={styles.progressText}>40%</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Date is important for determining your astrology profile
        </Text>

        {/* Date Picker */}
        <View style={styles.pickerWrapper}>
          {Platform.OS === 'ios' && (
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={(_, selectedDate) => selectedDate && setDate(selectedDate)}
              style={styles.datePicker}
              textColor="#fff"
            />
          )}
        </View>

        {/* Info */}
        <Text style={styles.info}>
          We use this to generate your AstroInsights wheel. We never share or sell your data.
        </Text>

        {/* Next */}
        <TouchableOpacity
          onPress={async () => {
            try {
              const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQ2NTU3NDM0LCJpYXQiOjE3NDY1NTM4MzQsImp0aSI6Ijc2MDMwZDcxZjNhYTQ0ZThiYWE1NDczZTQ4YmJiYjk1IiwidXNlcl9pZCI6MjZ9.G_poBh0Ia5Rcn2xILxNFE5n781xli1jGsKGDgtKLXDY';

              // Format date to ISO string, e.g. "1990-12-31"
              const formattedDate = date.toISOString().split('T')[0];

              const response = await fetch('https://0806-78-83-190-19.ngrok-free.app/authentication/on_boarding/', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  birth_date: formattedDate,
                }),
              });

              const data = await response.json();

              if (!response.ok) {
                console.log('Server error:', data);
                throw new Error(data?.message || 'Failed to submit birth date');
              }

              console.log('✅ Birth date submitted successfully:', data);
              router.push('/onboarding/time');
            } catch (error) {
              console.log('❌ Error submitting birth date:', error.message);
            }
          }}
        >
          <LinearGradient
            colors={['rgba(178, 131, 237, 1)', 'rgba(87, 124, 251, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            <Text style={styles.nextText}>Next</Text>
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
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
});
