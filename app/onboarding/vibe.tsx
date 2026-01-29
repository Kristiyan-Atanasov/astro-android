import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const vibeBg = require('../../assets/images/vibe-bg.png');
const vibeIcon = require('../../assets/images/vibe-icon.png');

export default function VibeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Background */}
      <Image source={vibeBg} style={styles.bg} resizeMode="cover" />

      {/* Card */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Image source={vibeIcon} style={styles.vibeIcon} />
          <Text style={styles.cardTitle}>Your daily vibe</Text>
        </View>

        <Text style={styles.cardQuote}>
          “Real liberation comes not from glossing{'\n'}
          over or repressing painful states of feeling,{'\n'}
          but only from experiencing them to the full.”
        </Text>

        <View style={styles.cardBar} />
        <View style={styles.cardBar} />
        <View style={styles.cardBar} />
      </View>

      {/* Continue Button */}
      <TouchableOpacity onPress={() => router.push('/home')}>
        <LinearGradient
          colors={['rgba(87, 102, 255, 1)', 'rgba(178, 131, 237, 1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
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
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    width: '100%',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  vibeIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    resizeMode: 'contain',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'CooperLtBT-Bold',
  },
  cardQuote: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 30,
    fontFamily: 'SFProDisplay-Regular',
  },
  cardBar: {
    marginTop: 8,
    height: 2,
    width: 24,
    borderRadius: 2,
    backgroundColor: '#00AEEF',
    alignSelf: 'center',
  },
  button: {
    height: 60,
    width: width - 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
});
