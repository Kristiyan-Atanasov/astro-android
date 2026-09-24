import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, Platform, Dimensions } from 'react-native';
import { Alert, AppAlertHost } from '../components/AppAlert';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { useTranslation } from 'react-i18next';
import { onSessionExpired } from '../services/sessionEvents';
import { initI18n } from '../services/i18n';
import { startNotificationAutoDismiss } from '../services/notifications';

const backgroundImg = require('../assets/images/background.png');
const starsImg = require('../assets/images/stars.png');

export default function RootLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const alertVisibleRef = useRef(false);
  const [i18nReady, setI18nReady] = useState(false);

  const [fontsLoaded] = useFonts({
    'Nunito-Regular': require('../assets/fonts/Nunito-Regular.ttf'),
    'Nunito-Bold': require('../assets/fonts/Nunito-Bold.ttf'),
    'CooperLtBT-Bold': require('../assets/fonts/CooperLtBTBold.ttf'),
    'SFProDisplay-Regular': require('../assets/fonts/sfprodisplay.otf'),
  });

  useEffect(() => {
    let cancelled = false;
    initI18n()
      .then(() => {
        if (!cancelled) setI18nReady(true);
      })
      .catch((e) => {
        console.log('i18n init failed:', (e as any)?.message ?? String(e));
        if (!cancelled) setI18nReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
  }, []);

  // Best-effort 1h tray cleanup even before Home mounts.
  useEffect(() => {
    return startNotificationAutoDismiss();
  }, []);

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      // De-dup: if multiple API calls fail with 401/403 at once we only
      // want to show one alert.
      if (alertVisibleRef.current) return;
      alertVisibleRef.current = true;

      Alert.alert(
        t('common.sessionExpiredTitle'),
        t('common.sessionExpiredBody'),
        [
          {
            text: t('common.ok'),
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
  }, [router, t]);

  if (!fontsLoaded || !i18nReady) return null;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <View style={styles.root}>
        {/* Background Layer */}
        <Image source={backgroundImg} style={styles.bg} resizeMode="cover" />
        <Image source={starsImg} style={styles.stars} resizeMode="cover" />

        {/* App Content */}
        <View style={styles.content}>
          <Slot />
        </View>

        <AppAlertHost />
      </View>
    </GestureHandlerRootView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
