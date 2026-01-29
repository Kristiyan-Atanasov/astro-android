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
import axios from 'axios';

const backgroundImg = require('../../assets/images/background.png');
const starsImg = require('../../assets/images/stars.png');

export default function NameScreen() {
  const router = useRouter();
  const [name, setName] = useState('');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background Layers */}
      <Image source={backgroundImg} style={styles.bg} resizeMode="cover" />
      <Image source={starsImg} style={styles.stars} resizeMode="cover" />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Your Name</Text>
        </View>

        {/* Progress Bar with Percentage */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={[styles.step, i === 0 && styles.activeStep]} />
              ))}
            </View>
            <Text style={styles.progressText}>20%</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Tell us about yourself so that we can make a more personalised prediction.
        </Text>

        {/* Input */}
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          style={styles.input}
        />

        {/* Info */}
        <Text style={styles.info}>
          We use this to generate your AstroInsights wheel. We never share or sell your data.
        </Text>

        {/* Next Button */}
        <TouchableOpacity
          onPress={async () => {
            try {
              // ✅ Hardcoded token: single line, plain string, no line breaks
              const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQ2NTU3NDM0LCJpYXQiOjE3NDY1NTM4MzQsImp0aSI6Ijc2MDMwZDcxZjNhYTQ0ZThiYWE1NDczZTQ4YmJiYjk1IiwidXNlcl9pZCI6MjZ9.G_poBh0Ia5Rcn2xILxNFE5n781xli1jGsKGDgtKLXDY';

              const response = await fetch('https://0806-78-83-190-19.ngrok-free.app/authentication/on_boarding/', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ name }),
              });

              const data = await response.json();

              if (!response.ok) {
                console.log('Server error:', data);
                throw new Error(data?.message || 'Failed to submit name');
              }

              console.log('✅ Name submitted successfully:', data);
              router.push('/onboarding/birthday');
            } catch (error) {
              console.log('❌ Error submitting name:', error.message);
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
    fontSize: 20, // ✅ updated font size
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
