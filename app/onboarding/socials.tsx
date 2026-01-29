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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const bgSocials = require('../../assets/images/bg-socials.png');

export default function SocialScreen() {
  const router = useRouter();
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');

  return (
    <View style={styles.container}>
      {/* Background */}
      <Image source={bgSocials} style={styles.bg} resizeMode="cover" />

      {/* Back button + Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Social Accounts</Text>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Connect with friends and make new contacts through the app.
      </Text>

      {/* Input Fields */}
      <View style={styles.inputWrapper}>
        <View style={styles.inputRow}>
          <Image source={require('../../assets/images/signin-graphic.png')} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="monika.stoyanova1993"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={facebook}
            onChangeText={setFacebook}
          />
        </View>

        <View style={styles.inputRow}>
          <Image source={require('../../assets/images/signin-graphic.png')} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="souljourney.1993"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={instagram}
            onChangeText={setInstagram}
          />
        </View>
      </View>

      {/* Info Text */}
      <Text style={styles.infoText}>
        Adding your social accounts will make people on the app connect with you through them if you allow public.
      </Text>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity onPress={() => router.push('/onboarding/vibe')}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>


        <TouchableOpacity onPress={() => router.push('/home')}>
          <LinearGradient
            colors={['rgba(87, 102, 255, 1)', 'rgba(178, 131, 237, 1)']}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'rgba(57, 60, 71, 0.4)',
    borderRadius: 999,
    padding: 10,
  },
  title: {
    fontSize: 22,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
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
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
});
