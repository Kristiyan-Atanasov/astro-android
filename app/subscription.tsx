import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  initIap,
  loadSubscriptionProducts,
  purchaseSubscription,
  restoreSubscriptions,
  isPremiumStatus,
} from '../services/iap';
import { DEFAULT_SUBSCRIPTION_SKU } from '../services/iapConfig';
import { getUserQualities } from '../services/api';

const homeBg = require('../assets/images/home-bg.png');
const moonImg = require('../assets/images/moon-banner.png');

const FALLBACK_PRICE = '€7.99';

type StoreProduct = {
  productId: string;
  localizedPrice?: string;
  price?: string;
  currency?: string;
  title?: string;
  introductoryPrice?: string;
  introductoryPriceNumberOfPeriodsIOS?: string;
  freeTrialPeriodAndroid?: string;
  subscriptionPeriodAndroid?: string;
  subscriptionPeriodUnitIOS?: string;
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initIap();
        const products = await loadSubscriptionProducts();
        if (cancelled || !isMounted.current) return;
        setProduct((products[0] as StoreProduct) ?? null);
      } catch (e) {
        console.log('subscription init error:', e);
      } finally {
        if (!cancelled && isMounted.current) {
          setLoadingProduct(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const priceLabel = product?.localizedPrice || product?.price
    ? product?.localizedPrice ?? `${product?.currency ?? ''} ${product?.price ?? ''}`.trim()
    : FALLBACK_PRICE;

  const ctaPriceLabel = priceLabel || FALLBACK_PRICE;

  const handleStart = useCallback(async () => {
    if (purchasing || restoring) return;
    setPurchasing(true);
    try {
      const result = await purchaseSubscription(
        product?.productId ?? DEFAULT_SUBSCRIPTION_SKU,
      );

      try {
        await getUserQualities();
      } catch (e) {
        console.log('refresh qualities after purchase error:', e);
      }

      if (!isMounted.current) return;

      if (isPremiumStatus(result?.status)) {
        Alert.alert(
          'Welcome to premium',
          'Your free trial has started. Enjoy your full archetype experience.',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/home'),
            },
          ],
        );
      } else {
        Alert.alert(
          'Subscription not active yet',
          'We received your purchase but it isn’t active yet. Please try again in a moment.',
        );
      }
    } catch (e: any) {
      const code = e?.code;
      const msg = String(e?.message ?? '');
      const userCancelled =
        code === 'E_USER_CANCELLED' ||
        code === 'E_DEFERRED_PAYMENT' ||
        msg.toLowerCase().includes('cancel');

      console.log('🛒 purchase failure raw:', JSON.stringify({ code, msg, e }));

      if (!userCancelled) {
        let title = 'Purchase failed';
        let body = msg || 'Something went wrong. Please try again.';

        if (code === 'verification-failed') {
          title = 'Verification failed';
          body = 'We couldn’t verify your subscription yet. Please try again.';
        } else if (code === 'E_IAP_NOT_AVAILABLE' || msg.includes('not available on this device')) {
          title = 'Not available here';
          body = 'In-app purchases aren’t available on this device. Try on a real device with the App Store / Google Play.';
        } else if (code === 'E_ITEM_UNAVAILABLE' || code === 'E_SKU_NOT_FOUND' || msg.toLowerCase().includes('not found')) {
          title = 'Subscription not configured';
          body = `The subscription product (${product?.productId ?? DEFAULT_SUBSCRIPTION_SKU}) isn’t available. Make sure it exists in App Store Connect / Play Console and is approved for testing.`;
        } else if (code === 'E_NOT_PREPARED' || code === 'E_SERVICE_ERROR') {
          title = 'Store not ready';
          body = 'The store connection wasn’t ready. Please close and reopen the app, then try again.';
        } else if (msg.includes('access token') || msg.includes('Session expired')) {
          title = 'Sign in required';
          body = 'Please sign in again before subscribing.';
        }

        Alert.alert(`${title}${code ? ` (${code})` : ''}`, body);
      }
    } finally {
      if (isMounted.current) setPurchasing(false);
    }
  }, [product?.productId, purchasing, restoring, router]);

  const handleRestore = useCallback(async () => {
    if (purchasing || restoring) return;
    setRestoring(true);
    try {
      const result = await restoreSubscriptions();

      if (!result) {
        Alert.alert('Nothing to restore', 'We couldn’t find any active subscription on this account.');
        return;
      }

      try {
        await getUserQualities();
      } catch (e) {
        console.log('refresh qualities after restore error:', e);
      }

      if (!isMounted.current) return;

      if (isPremiumStatus(result.status)) {
        Alert.alert(
          'Subscription restored',
          'Your premium access is active again.',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/home'),
            },
          ],
        );
      } else {
        Alert.alert(
          'No active subscription',
          'We could not find an active subscription on this account.',
        );
      }
    } catch (e: any) {
      Alert.alert(
        'Restore failed',
        e?.message || 'We couldn’t restore purchases. Please try again.',
      );
    } finally {
      if (isMounted.current) setRestoring(false);
    }
  }, [purchasing, restoring, router]);

  return (
    <View style={styles.container}>
      <Image source={homeBg} style={styles.bg} resizeMode="cover" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Text style={styles.subtitle}>Let’s get started</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>How your free trial{"\n"}works</Text>

        <Image source={moonImg} style={styles.moonImage} resizeMode="contain" />

        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionRow}>
            <Text style={styles.planLabel}>Monthly Subscription</Text>

            <LinearGradient
              colors={['rgba(178, 131, 237, 1)', 'rgba(87, 124, 251, 1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.discountBadge}
            >
              <Text style={styles.discountText}>38% off</Text>
            </LinearGradient>
          </View>

          <Text style={styles.trialText}>with 7 days free trial</Text>
          {loadingProduct ? (
            <View style={styles.priceLoaderRow}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <Text style={styles.price}>{priceLabel}</Text>
          )}
        </View>

        <View style={styles.spacer} />

        <Text style={styles.secureText}>
          Secured with {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}. Cancel Anytime.
        </Text>

        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.9}
          onPress={handleStart}
          disabled={purchasing || restoring}
        >
          <LinearGradient
            colors={['rgba(87, 124, 251, 1)', 'rgba(178, 131, 237, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            {purchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText} numberOfLines={2}>
                Start your 7-days free trial, then {ctaPriceLabel} / per month
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.note}>
          Cancel anytime during your trial and you won’t be charged.
        </Text>

        <TouchableOpacity
          style={styles.restoreLinkHit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={handleRestore}
          disabled={purchasing || restoring}
        >
          {restoring ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.restoreLink}>Restore purchases</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerLinks}>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/terms')}
          >
            <Text style={styles.link}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/privacy')}
          >
            <Text style={styles.link}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/subscription')}
          >
            <Text style={styles.link}>Subscription terms</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bg: {
    position: 'absolute',
    width,
    height: '100%',
    top: 0,
    left: 0,
    zIndex: -1,
  },
  scroll: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SFProDisplay-Regular',
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 34,
  },
  moonImage: {
    width: width - 140,
    height: 70,
    alignSelf: 'center',
    marginBottom: 28,
  },
  subscriptionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(140,140,200,0.18)',
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'CooperLtBT-Bold',
  },
  discountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
  },
  trialText: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 6,
    fontFamily: 'SFProDisplay-Regular',
  },
  price: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'CooperLtBT-Bold',
    marginTop: 10,
  },
  priceLoaderRow: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  secureText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#aaa',
    marginBottom: 12,
    fontFamily: 'SFProDisplay-Regular',
  },
  ctaButton: {
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 14,
  },
  gradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    fontFamily: 'Nunito-Bold',
    lineHeight: 20,
  },
  note: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'SFProDisplay-Regular',
  },
  restoreLinkHit: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  restoreLink: {
    color: '#D3D5FB',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  linkHit: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  link: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'SFProDisplay-Regular',
  },
});
