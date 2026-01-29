import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Text, Platform, Dimensions } from 'react-native';
import { Slot } from 'expo-router';
import { useFonts } from 'expo-font';

const backgroundImg = require('../assets/images/background.png');
const starsImg = require('../assets/images/stars.png');

export default function RootLayout() {
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
