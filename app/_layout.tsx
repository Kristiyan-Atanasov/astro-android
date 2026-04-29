import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Text, Platform, Dimensions, Alert } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { onSessionExpired } from '../services/sessionEvents';

const backgroundImg = require('../assets/images/background.png');
const starsImg = require('../assets/images/stars.png');

export default function RootLayout() {
  const router = useRouter();
  const alertVisibleRef = useRef(false);

  const [fontsLoaded] = useFonts({
    'Nunito-Regular': require('../assets/fonts/Nunito-Regular.ttf'),
    'Nunito-Bold': require('../assets/fonts/Nunito-Bold.ttf'),
    'CooperLtBT-Bold': require('../assets/fonts/CooperLtBTBold.ttf'),
    'SFProDisplay-Regular': require('../assets/fonts/sfprodisplay.otf'),
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      // De-dup: if multiple API calls fail with 401/403 at once we only
      // want to show one alert.
      if (alertVisibleRef.current) return;
      alertVisibleRef.current = true;

      Alert.alert(
        'Session expired',
        'You have been signed out for your security. Please sign in again to continue.',
        [
          {
            text: 'OK',
            onPress: () => {
              alertVisibleRef.current = false;
              try {
                router.replace('/');
              } catch (e) {
                console.log('Session expiry redirect failed:', (e as any)?.message ?? String(e));
              }
            },
          },
        ],
        { cancelable: false }
      );
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.root}>
      {/* Background Layer */}
      <Image source={backgroundImg} style={styles.bg} resizeMode="cover" />
      <Image source={starsImg} style={styles.stars} resizeMode="cover" />

      {/* App Content */}
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    width,
    height,
    overflow: 'hidden',
    position: 'relative',
  },
  bg: {
    position: 'absolute',
    width,
    height,
    zIndex: -2,
    top: 0,
    left: 0,
  },
  stars: {
    position: 'absolute',
    width,
    height,
    zIndex: -1,
    top: 0,
    left: 0,
  },
  content: {
    flex: 1,
    height,
    width,
  },
});
