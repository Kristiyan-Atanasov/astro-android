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
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
import {
  MONTHLY_SUBSCRIPTION_SKU,
  YEARLY_SUBSCRIPTION_SKU,
} from '../services/iapConfig';
import { getUserQualities } from '../services/api';

const homeBg = require('../assets/images/home-bg.png');
const moonImg = require('../assets/images/moon-banner.png');

// Used when the store hasn't returned a real localized price yet
// (e.g. sandbox without product approval, or first load before
// `loadSubscriptionProducts` resolves).
const FALLBACK_MONTHLY_PRICE = '€7.99';
const FALLBACK_YEARLY_PRICE = '€70.00';

type StoreProduct = {
  id: string;
  displayPrice?: string;
  price?: number | null;
  currency?: string;
  title?: string;
  introductoryPrice?: string;
  introductoryPriceNumberOfPeriodsIOS?: string;
  freeTrialPeriodAndroid?: string;
  subscriptionPeriodAndroid?: string;
  subscriptionPeriodUnitIOS?: string;
};

type PlanKey = 'monthly' | 'yearly';

// Feature flag — when false, the screen never touches the native
// react-native-iap module (so the page can't freeze on
// `RNIap.initConnection()` while StoreKit / the products aren't set up
// yet) and the CTA opens a support email instead of purchasing. Set to
// `true` once the subscription products exist in App Store Connect and
// the `/payments/verify/` backend endpoint is live end-to-end.
const IAP_ENABLED = true;

// Where the "contact support" fallback ends up while purchases are
// disabled. Kept in sync with `app/edit-profile.tsx`.
const SUPPORT_EMAIL = 'astro.insights.ltd@gmail.com';

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [monthlyProduct, setMonthlyProduct] = useState<StoreProduct | null>(null);
  const [yearlyProduct, setYearlyProduct] = useState<StoreProduct | null>(null);
  // We no longer block rendering on the IAP roundtrip — the cards paint
  // immediately with fallback prices, and the store load just upgrades
  // them in the background when (and if) it returns. This keeps the
  // upgrade page usable even when `react-native-iap` hangs (common on
  // iOS simulators without a StoreKit configuration file).
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('monthly');
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
    if (!IAP_ENABLED) return;
    let cancelled = false;
    (async () => {
      try {
        await initIap();

        // Only query the known-good monthly SKU while the screen opens.
        // The yearly option still renders from its fallback price, and
        // the store is queried for the yearly SKU only if the user
        // explicitly selects it and taps the CTA.
        const products = (await loadSubscriptionProducts([
          MONTHLY_SUBSCRIPTION_SKU,
        ])) as StoreProduct[];

        if (cancelled || !isMounted.current) return;
        const matched =
          products.find((p) => p?.id === MONTHLY_SUBSCRIPTION_SKU) ?? null;
        setMonthlyProduct(matched);
        setYearlyProduct(null);
      } catch (e: any) {
        console.log('subscription init error:', e?.message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatStoreOrFallback = (
    product: StoreProduct | null,
    fallback: string,
  ): string => {
    if (!product) return fallback;
    if (product.displayPrice) return product.displayPrice;
    if (product.price != null) {
      return `${product.currency ?? ''} ${product.price}`.trim();
    }
    return fallback;
  };

  const monthlyPriceLabel = formatStoreOrFallback(
    monthlyProduct,
    FALLBACK_MONTHLY_PRICE,
  );
  const yearlyPriceLabel = formatStoreOrFallback(
    yearlyProduct,
    FALLBACK_YEARLY_PRICE,
  );

  const selectedSku =
    selectedPlan === 'yearly'
      ? yearlyProduct?.id ?? YEARLY_SUBSCRIPTION_SKU
      : monthlyProduct?.id ?? MONTHLY_SUBSCRIPTION_SKU;
  const selectedPriceLabel =
    selectedPlan === 'yearly' ? yearlyPriceLabel : monthlyPriceLabel;
  const ctaLabel =
    selectedPlan === 'yearly'
      ? t('subscription.ctaYearly', { price: selectedPriceLabel })
      : t('subscription.cta', { price: selectedPriceLabel });
  const noteLabel =
    selectedPlan === 'yearly'
      ? t('subscription.cancelInfoYearly')
      : t('subscription.cancelInfo');

  // While `IAP_ENABLED` is false we don't touch the native store at
  // all. We surface a friendly alert with a "Contact support" action
  // that drafts an email to the same address used by the rest of the
  // app for change requests.
  const openSupportMail = useCallback(() => {
    const subject = encodeURIComponent(t('subscription.supportSubject'));
    const body = encodeURIComponent(
      t('subscription.supportBody', { plan: selectedPlan }),
    );
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    Linking.openURL(url).catch((e) => {
      console.log('openSupportMail failed:', e?.message ?? String(e));
      Alert.alert(
        t('subscription.unavailableTitle'),
        t('subscription.unavailableMailFallback', { email: SUPPORT_EMAIL }),
      );
    });
  }, [selectedPlan, t]);

  const showUnavailableAlert = useCallback(() => {
    Alert.alert(
      t('subscription.unavailableTitle'),
      t('subscription.unavailableBody'),
      [
        { text: t('common.notNow'), style: 'cancel' },
        {
          text: t('subscription.contactSupport'),
          onPress: openSupportMail,
        },
      ],
      { cancelable: true },
    );
  }, [openSupportMail, t]);

  const handleStart = useCallback(async () => {
    if (purchasing || restoring) return;
    if (!IAP_ENABLED) {
      showUnavailableAlert();
      return;
    }
    setPurchasing(true);
    try {
      const result = await purchaseSubscription(selectedSku);

      try {
        await getUserQualities();
      } catch (e) {
        console.log('refresh qualities after purchase error:', e);
      }

      if (!isMounted.current) return;

      if (isPremiumStatus(result?.status)) {
        Alert.alert(
          t('subscription.welcomeTitle'),
          t('subscription.welcomeBody'),
          [
            {
              text: t('subscription.continue'),
              onPress: () => router.replace('/home'),
            },
          ],
        );
      } else {
        Alert.alert(
          t('subscription.notActiveTitle'),
          t('subscription.notActiveBody'),
        );
      }
    } catch (e: any) {
      const code = e?.code;
      const msg = String(e?.message ?? '');
      const userCancelled =
        code === 'E_USER_CANCELLED' ||
        code === 'E_DEFERRED_PAYMENT' ||
        msg.toLowerCase().includes('cancel');

      console.log('purchase failure raw:', JSON.stringify({ code, msg }));

      if (!userCancelled) {
        let title = t('subscription.purchaseFailedTitle');
        let body = msg || t('subscription.purchaseFailedBody');

        if (code === 'verification-failed') {
          title = t('subscription.verificationFailedTitle');
          body = t('subscription.verificationFailedBody');
        } else if (
          code === 'E_IAP_NOT_AVAILABLE' ||
          msg.includes('not available on this device')
        ) {
          title = t('subscription.notAvailableTitle');
          body = t('subscription.notAvailableBody');
        } else if (
          code === 'E_ITEM_UNAVAILABLE' ||
          code === 'E_SKU_NOT_FOUND' ||
          msg.toLowerCase().includes('not found')
        ) {
          title = t('subscription.notConfiguredTitle');
          body = t('subscription.notConfiguredBody', { sku: selectedSku });
        } else if (code === 'E_NOT_PREPARED' || code === 'E_SERVICE_ERROR') {
          title = t('subscription.notReadyTitle');
          body = t('subscription.notReadyBody');
        } else if (
          msg.includes('access token') ||
          msg.includes('Session expired')
        ) {
          title = t('subscription.signInRequiredTitle');
          body = t('subscription.signInRequiredBody');
        }

        Alert.alert(`${title}${code ? ` (${code})` : ''}`, body);
      }
    } finally {
      if (isMounted.current) setPurchasing(false);
    }
  }, [selectedSku, purchasing, restoring, router, t, showUnavailableAlert, selectedPlan]);

  const handleRestore = useCallback(async () => {
    if (purchasing || restoring) return;
    if (!IAP_ENABLED) {
      showUnavailableAlert();
      return;
    }
    setRestoring(true);
    try {
      const result = await restoreSubscriptions();

      if (!result) {
        Alert.alert(
          t('subscription.nothingToRestoreTitle'),
          t('subscription.nothingToRestoreBody'),
        );
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
          t('subscription.restoredTitle'),
          t('subscription.restoredBody'),
          [
            {
              text: t('subscription.continue'),
              onPress: () => router.replace('/home'),
            },
          ],
        );
      } else {
        Alert.alert(
          t('subscription.noActiveTitle'),
          t('subscription.noActiveBody'),
        );
      }
    } catch (e: any) {
      Alert.alert(
        t('subscription.restoreFailedTitle'),
        e?.message || t('subscription.restoreFailedBody'),
      );
    } finally {
      if (isMounted.current) setRestoring(false);
    }
  }, [purchasing, restoring, router, t, showUnavailableAlert]);

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
          <Text style={styles.subtitle}>
            {t('subscription.letsGetStarted')}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{t('subscription.title')}</Text>

        <Image source={moonImg} style={styles.moonImage} resizeMode="contain" />

        <View style={styles.plansStack}>
          <PlanCard
            label={t('subscription.planMonthly')}
            badgeText={t('subscription.discount')}
            subtitle={t('subscription.trial')}
            priceLabel={monthlyPriceLabel}
            periodLabel={t('subscription.perMonth')}
            selected={selectedPlan === 'monthly'}
            onSelect={() => setSelectedPlan('monthly')}
            disabled={purchasing || restoring}
            style={styles.planCardSpacing}
          />
          <PlanCard
            label={t('subscription.planYearly')}
            badgeText={t('subscription.bestValue')}
            subtitle={t('subscription.yearlyBilling')}
            priceLabel={yearlyPriceLabel}
            periodLabel={t('subscription.perYear')}
            selected={selectedPlan === 'yearly'}
            onSelect={() => setSelectedPlan('yearly')}
            disabled={purchasing || restoring}
          />
        </View>

        <View style={styles.spacer} />

        <Text style={styles.secureText}>
          {Platform.OS === 'ios'
            ? t('subscription.securedAppStore')
            : t('subscription.securedPlayStore')}
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
                {ctaLabel}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.note}>{noteLabel}</Text>

        <TouchableOpacity
          style={styles.restoreLinkHit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={handleRestore}
          disabled={purchasing || restoring}
        >
          {restoring ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.restoreLink}>
              {t('subscription.restore')}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerLinks}>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/terms')}
          >
            <Text style={styles.link}>{t('legalLinks.terms')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/privacy')}
          >
            <Text style={styles.link}>{t('legalLinks.privacy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/subscription')}
          >
            <Text style={styles.link}>{t('legalLinks.subscription')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

interface PlanCardProps {
  label: string;
  badgeText?: string;
  subtitle?: string;
  priceLabel: string;
  periodLabel: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  style?: object;
}

// Individual selectable plan tile. The whole card is tappable; the
// radio dot on the right just mirrors the current selection. We keep
// the visual highlight subtle (border + slight gradient) so the two
// cards still read as related options rather than one promoted CTA.
function PlanCard({
  label,
  badgeText,
  subtitle,
  priceLabel,
  periodLabel,
  selected,
  onSelect,
  disabled,
  style,
}: PlanCardProps) {
  return (
    <TouchableOpacity
      style={[styles.planCard, selected && styles.planCardSelected, style]}
      onPress={onSelect}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <View style={styles.planHeaderRow}>
        <Text style={styles.planLabel}>{label}</Text>
        {badgeText ? (
          <LinearGradient
            colors={['rgba(178, 131, 237, 1)', 'rgba(87, 124, 251, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.planBadge}
          >
            <Text style={styles.planBadgeText}>{badgeText}</Text>
          </LinearGradient>
        ) : null}
      </View>

      {subtitle ? <Text style={styles.planSubtitle}>{subtitle}</Text> : null}

      <View style={styles.planPriceRow}>
        <Text style={styles.planPrice}>{priceLabel}</Text>
        <Text style={styles.planPeriod}>{periodLabel}</Text>

        <View style={styles.planRadioSlot}>
          <View style={[styles.planRadio, selected && styles.planRadioActive]}>
            {selected ? (
              <Ionicons name="checkmark" size={14} color="#fff" />
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
  plansStack: {
    width: '100%',
  },
  planCardSpacing: {
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(140,140,200,0.18)',
  },
  planCardSelected: {
    borderColor: 'rgba(178, 131, 237, 0.9)',
    backgroundColor: 'rgba(87, 124, 251, 0.12)',
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'CooperLtBT-Bold',
    flex: 1,
    marginRight: 12,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
  },
  planSubtitle: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 6,
    fontFamily: 'SFProDisplay-Regular',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  planPrice: {
    color: '#fff',
    fontSize: 26,
    fontFamily: 'CooperLtBT-Bold',
  },
  planPeriod: {
    color: '#aaa',
    fontSize: 13,
    marginLeft: 8,
    fontFamily: 'SFProDisplay-Regular',
  },
  planRadioSlot: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioActive: {
    borderColor: 'rgba(178, 131, 237, 1)',
    backgroundColor: 'rgba(178, 131, 237, 1)',
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
