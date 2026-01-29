import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import data from '../assets/data/insights.json';

export default function WelcomeScreen() {
  const router = useRouter();
  const { title, subtitle, button, links } = data.welcome;

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/planet.png')}
        style={styles.planet}
        resizeMode="contain"
      />

      {/* Welcome Text */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* Get Started Button */}
      <TouchableOpacity style={styles.button} onPress={() => router.push('/signin')}>
        <Text style={styles.buttonText}>{button}</Text>
      </TouchableOpacity>

      {/* Footer Links (no loop) */}
      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={() => router.push(links[0].route as any)}>
          <Text style={styles.link}>{links[0].label}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push(links[1].route as any)}>
          <Text style={styles.link}>{links[1].label}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push(links[2].route as any)}>
          <Text style={styles.link}>{links[2].label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planet: {
    width: 350,
    height: 350,
    marginTop: 0,
  },
  title: {
    fontSize: 35,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'CooperLtBT-Bold',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#fff',
    marginBottom: 20,
    fontFamily: 'Nunito-Regular',
  },
  button: {
    backgroundColor: '#333',
    width: 328,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  linksContainer: {
    position: 'absolute',
    bottom: 20, // ✅ Fixed 20px from bottom
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  link: {
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#ccc',
    textDecorationLine: 'underline',
    marginHorizontal: 5,
    fontFamily: 'Nunito-Regular',
  },
});
