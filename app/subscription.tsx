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
  Linking,
  AppState,
} from 'react-native';
import { Alert } from '../components/AppAlert';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  initIap,
  loadSubscriptionProducts,
  purchaseSubscription,
  purchaseDeferredPlanChange,
  restoreSubscriptions,
  isPremiumStatus,
  describeSubscriptionProduct,
  profileSubscriptionState,
} from '../services/iap';
import {
  MONTHLY_SUBSCRIPTION_SKU,
  YEARLY_SUBSCRIPTION_SKU,
  MONTHLY_BASE_PLAN_ID,
  YEARLY_BASE_PLAN_ID,
} from '../services/iapConfig';
import {
  getSubscriptionSummary,
  getUserProfile,
  getUserQualities,
  prepareSubscriptionChange,
} from '../services/api';

const homeBg = require('../assets/images/home-bg-horizon.jpg');

type StoreProduct = {
  id: string;
  displayPrice?: string;
  price?: number | null;
  currency?: string;
};

type PlanKey = 'monthly' | 'yearly';

type PlanChange = {
  product_id: string;
  plan: string | null;
  base_plan_id: string | null;
};

type PendingChange = {
  product_id: string;
  base_plan_id: string | null;
  plan: string | null;
  effective_at: string | null;
};

type SubscriptionRow = {
  id: number;
  provider: string;
  product_id: string | null;
  plan: string | null;
  base_plan_id: string | null;
  status: string;
  has_access: boolean;
  is_auto_renewing: boolean;
  current_period_end: string | null;
  renews_at: string | null;
  access_until: string | null;
  is_trial: boolean | null;
  trial_ends_at: string | null;
  pending_change: PendingChange | null;
  manage_url: string | null;
  can_change_plan: boolean;
  available_changes: PlanChange[];
};

type SubscriptionSummary = {
  has_active_subscription: boolean;
  access_until: string | null;
  subscriptions: SubscriptionRow[];
};

const IAP_ENABLED = true;
const SUPPORT_EMAIL = 'astro.insights.ltd@gmail.com';
const DAY_MS = 24 * 60 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatWhen(iso: string | null | undefined, language: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const locale = language.toLowerCase().startsWith('bg') ? 'bg-BG' : 'en-GB';
  const near = Math.abs(date.getTime() - Date.now()) < 2 * DAY_MS;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(near ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function shouldManage(row: SubscriptionRow): boolean {
  if (!row) return false;
  if (row.has_access || row.pending_change) return true;
  return row.status === 'on_hold' || row.status === 'in_grace_period' || row.status === 'paused';
}

function userCancelledPurchase(error: { code?: string; message?: string } | null): boolean {
  const code = error?.code;
  const msg = String(error?.message ?? '');
  return code === 'E_USER_CANCELLED' || code === 'E_USER_CANCELED' || msg.toLowerCase().includes('cancel');
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [productError, setProductError] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
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

  const refreshDetails = useCallback(async () => {
    try {
      const [nextSummary] = await Promise.all([
        getSubscriptionSummary(),
        getUserProfile(),
      ]);
      if (!isMounted.current) return null;
      setSummary(nextSummary);
      setSummaryError(null);
      return nextSummary as SubscriptionSummary;
    } catch (e: any) {
      console.log('subscription summary error:', e?.code ?? null, e?.message ?? String(e));
      if (!isMounted.current) return null;
      setSummaryError(e?.message || t('subscription.summaryFailed'));
      return null;
    } finally {
      if (isMounted.current) setSummaryLoading(false);
    }
  }, [t]);

  const loadProducts = useCallback(async () => {
    if (!IAP_ENABLED) return;
    setProductsLoading(true);
    try {
      await initIap();
      const list = (await loadSubscriptionProducts([
        MONTHLY_SUBSCRIPTION_SKU,
        YEARLY_SUBSCRIPTION_SKU,
      ])) as StoreProduct[];
      if (!isMounted.current) return;
      setProducts(list);
      setProductError(null);
    } catch (e: any) {
      console.log('subscription products error:', e?.code ?? null, e?.message ?? String(e));
      if (!isMounted.current) return;
      const code = e?.code ? ` (${e.code})` : '';
      setProductError(`${e?.message || t('subscription.productsFailed')}${code}`);
    } finally {
      if (isMounted.current) setProductsLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void refreshDetails();
    }, [refreshDetails]),
  );

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshDetails();
    });
    return () => sub.remove();
  }, [refreshDetails]);

  const productById = (sku: string | null | undefined) =>
    products.find((product) => product.id === sku) ?? null;

  const monthlyOffer = describeSubscriptionProduct(
    productById(MONTHLY_SUBSCRIPTION_SKU),
    { allowTrial: true, basePlanId: MONTHLY_BASE_PLAN_ID },
  );
  const yearlyOffer = describeSubscriptionProduct(
    productById(YEARLY_SUBSCRIPTION_SKU),
    { allowTrial: false, basePlanId: YEARLY_BASE_PLAN_ID },
  );

  const priceFor = (sku: string | null | undefined, basePlanId: string | null | undefined, allowTrial: boolean) => {
    const described = describeSubscriptionProduct(productById(sku), {
      allowTrial,
      basePlanId: basePlanId || '',
    });
    return described.priceLabel || '';
  };

  const managementRows = (summary?.subscriptions || []).filter(shouldManage);
  const showPurchase = Boolean(
    summary &&
    !summaryError &&
    !summary.has_active_subscription &&
    managementRows.length === 0,
  );

  const monthlyHasTrial = Boolean(monthlyOffer.offerToken && monthlyOffer.hasTrial);
  const monthlyTrialDays = monthlyHasTrial ? monthlyOffer.trialDays : null;
  const selectedSku = selectedPlan === 'yearly' ? YEARLY_SUBSCRIPTION_SKU : MONTHLY_SUBSCRIPTION_SKU;
  const selectedOffer = selectedPlan === 'yearly' ? yearlyOffer : monthlyOffer;
  const selectedPriceLabel = selectedOffer.priceLabel;
  const selectedReady = Boolean(selectedOffer.offerToken && selectedPriceLabel);
  const selectedStartsTrial = selectedPlan === 'monthly' && monthlyHasTrial;

  const planLabel = (plan: string | null | undefined) => {
    if (plan === 'monthly') return t('subscription.planNameMonthly');
    if (plan === 'yearly') return t('subscription.planNameYearly');
    if (plan === 'complimentary') return t('subscription.planNameComplimentary');
    return t('subscription.planNamePremium');
  };

  const pendingLine = (row: SubscriptionRow) => {
    const pending = row.pending_change;
    if (!pending?.effective_at) return '';
    return t('subscription.pendingChange', {
      current: planLabel(row.plan),
      until: formatWhen(row.access_until || row.current_period_end || pending.effective_at, i18n.language),
      next: planLabel(pending.plan),
      starts: formatWhen(pending.effective_at, i18n.language),
    });
  };

  const rowLines = (row: SubscriptionRow): string[] => {
    const lines: string[] = [];
    const pending = pendingLine(row);
    if (pending) lines.push(pending);
    if (row.is_trial === true) {
      lines.push(t('subscription.trialEnds', {
        date: formatWhen(row.trial_ends_at || row.access_until, i18n.language),
      }));
      const price = priceFor(row.product_id, row.base_plan_id, false);
      if (price) lines.push(t('subscription.trialThenPrice', { price }));
    }
    if (row.plan === 'complimentary') {
      lines.push(t('subscription.complimentaryUntil', {
        date: formatWhen(row.access_until, i18n.language),
      }));
    }
    if (row.status === 'in_grace_period') lines.push(t('subscription.grace'));
    else if (row.status === 'on_hold') lines.push(t('subscription.onHold'));
    else if (row.status === 'paused') lines.push(t('subscription.paused'));
    else if (!pending && row.is_trial !== true && row.plan !== 'complimentary') {
      if (row.has_access && row.is_auto_renewing && row.renews_at) {
        lines.push(t('subscription.renews', {
          plan: planLabel(row.plan),
          date: formatWhen(row.renews_at, i18n.language),
        }));
      } else if (row.has_access && row.is_auto_renewing === false) {
        lines.push(t('subscription.accessEnds', {
          date: formatWhen(row.access_until || row.current_period_end, i18n.language),
        }));
      }
    }
    return lines;
  };

  const ctaLabel = selectedPlan === 'yearly'
    ? t('subscription.ctaYearly', { price: selectedPriceLabel })
    : selectedStartsTrial
      ? monthlyTrialDays
        ? t('subscription.ctaTrial', { count: monthlyTrialDays, price: selectedPriceLabel })
        : t('subscription.ctaTrialGeneric', { price: selectedPriceLabel })
      : t('subscription.ctaSubscribe', { price: selectedPriceLabel });
  const noteLabel = selectedPlan === 'yearly'
    ? t('subscription.cancelInfoYearly')
    : selectedStartsTrial
      ? t('subscription.cancelInfoTrial')
      : t('subscription.cancelInfo');
  const titleLabel = !showPurchase
    ? t('subscription.manageTitle')
    : selectedStartsTrial
      ? t('subscription.titleTrial')
      : t('subscription.title');

  const openSupportMail = useCallback(() => {
    const subject = encodeURIComponent(t('subscription.supportSubject'));
    const body = encodeURIComponent(t('subscription.supportBody', { plan: selectedPlan }));
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(
        t('subscription.unavailableTitle'),
        t('subscription.unavailableMailFallback', { email: SUPPORT_EMAIL }),
      );
    });
  }, [selectedPlan, t]);

  const showUnavailableAlert = useCallback(() => {
    Alert.alert(t('subscription.unavailableTitle'), t('subscription.unavailableBody'), [
      { text: t('common.notNow'), style: 'cancel' },
      { text: t('subscription.contactSupport'), onPress: openSupportMail },
    ]);
  }, [openSupportMail, t]);

  const openManage = useCallback((url: string) => {
    Linking.openURL(url).catch((e) => {
      console.log('open manage url failed:', e?.message ?? String(e));
    });
  }, []);

  const handleRestore = useCallback(async () => {
    if (purchasing || restoring) return;
    if (!IAP_ENABLED) {
      showUnavailableAlert();
      return;
    }
    setRestoring(true);
    try {
      const result = await restoreSubscriptions();
      const [latest, profile] = await Promise.all([
        getSubscriptionSummary().catch(() => null),
        getUserProfile(),
      ]);
      try {
        await getUserQualities();
      } catch (e) {
        console.log('refresh qualities after restore error:', e);
      }
      if (!isMounted.current) return;
      if (latest) {
        setSummary(latest);
        setSummaryError(null);
      }
      const premium = Boolean(
        latest?.has_active_subscription ||
        profileSubscriptionState(profile) === 'active' ||
        (result && isPremiumStatus(result.status)),
      );
      if (premium) {
        Alert.alert(t('subscription.restoredTitle'), t('subscription.restoredBody'), [
          { text: t('subscription.continue'), onPress: () => router.replace('/home') },
        ]);
        return;
      }
      if (!result) {
        Alert.alert(t('subscription.nothingToRestoreTitle'), t('subscription.nothingToRestoreBody'));
        return;
      }
      Alert.alert(t('subscription.noActiveTitle'), t('subscription.noActiveBody'));
    } catch (e: any) {
      Alert.alert(t('subscription.restoreFailedTitle'), e?.message || t('subscription.restoreFailedBody'));
    } finally {
      if (isMounted.current) setRestoring(false);
    }
  }, [purchasing, restoring, router, showUnavailableAlert, t]);

  const handleStart = useCallback(async () => {
    if (purchasing || restoring || !showPurchase) return;
    if (!IAP_ENABLED) {
      showUnavailableAlert();
      return;
    }
    if (!selectedReady) return;
    setPurchasing(true);
    try {
      const current = await getSubscriptionSummary();
      if (!isMounted.current) return;
      setSummary(current);
      if (current?.has_active_subscription || (current?.subscriptions || []).some(shouldManage)) {
        return;
      }

      const result = await purchaseSubscription(selectedSku);
      try {
        await getUserQualities();
      } catch (e) {
        console.log('refresh qualities after purchase error:', e);
      }
      const latest = await getSubscriptionSummary();
      await getUserProfile();
      if (!isMounted.current) return;
      setSummary(latest);

      const trialRow = (latest?.subscriptions || []).find((row) => row.is_trial === true);
      if (isPremiumStatus(result?.status) || latest?.has_active_subscription) {
        Alert.alert(
          t('subscription.activeTitle'),
          trialRow
            ? t('subscription.trialEnds', {
                date: formatWhen(trialRow.trial_ends_at || trialRow.access_until, i18n.language),
              })
            : t('subscription.welcomeBody'),
          [{ text: t('subscription.continue'), onPress: () => router.replace('/home') }],
        );
      } else {
        Alert.alert(t('subscription.notActiveTitle'), t('subscription.notActiveBody'));
      }
    } catch (e: any) {
      if (userCancelledPurchase(e)) return;
      const code = e?.code;
      const msg = String(e?.message ?? '');
      console.log('purchase failure:', code ?? null, msg);
      if (code === 'E_VERIFY_TIMEOUT' || code === 'E_TIMEOUT' || /timed out/i.test(msg)) {
        Alert.alert(t('subscription.verifyTimeoutTitle'), t('subscription.verifyTimeoutBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('subscription.restore'), onPress: () => { void handleRestore(); } },
        ]);
        return;
      }
      if (code === 'E_PENDING') {
        Alert.alert(t('subscription.notActiveTitle'), t('subscription.notActiveBody'));
        return;
      }
      Alert.alert(
        t('subscription.purchaseFailedTitle'),
        msg || t('subscription.purchaseFailedBody'),
      );
    } finally {
      if (isMounted.current) setPurchasing(false);
    }
  }, [
    handleRestore,
    i18n.language,
    purchasing,
    restoring,
    router,
    selectedReady,
    selectedSku,
    showPurchase,
    showUnavailableAlert,
    t,
  ]);

  const handleChangePlan = useCallback(async (row: SubscriptionRow, change: PlanChange) => {
    if (purchasing || restoring) return;
    if (row.provider !== 'google' || !row.can_change_plan) return;
    if (!IAP_ENABLED) {
      showUnavailableAlert();
      return;
    }
    setPurchasing(true);
    try {
      const prepared = await prepareSubscriptionChange(row.id, change.product_id);
      await purchaseDeferredPlanChange(prepared);

      let latest: SubscriptionSummary | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        latest = await getSubscriptionSummary();
        const updated = latest?.subscriptions?.find((item) => item.id === row.id);
        if (updated?.pending_change) break;
        if (attempt < 2) await sleep(1500);
      }
      try {
        await getUserQualities();
        await getUserProfile();
      } catch (e) {
        console.log('refresh after plan change error:', e);
      }
      if (!isMounted.current) return;
      if (latest) setSummary(latest);

      const updated = latest?.subscriptions?.find((item) => item.id === row.id);
      if (updated?.pending_change) {
        Alert.alert(
          t('subscription.changeScheduledTitle'),
          pendingLine(updated) || t('subscription.changeSyncBody'),
        );
      } else {
        Alert.alert(t('subscription.changeSyncTitle'), t('subscription.changeSyncBody'));
      }
    } catch (e: any) {
      if (userCancelledPurchase(e)) return;
      console.log('plan change failed:', e?.status ?? null, e?.code ?? null, e?.message ?? String(e));
      if (e?.status === 409 || e?.code === 'subscription-conflict') {
        await refreshDetails();
        Alert.alert(t('subscription.changeConflictTitle'), t('subscription.changeConflictBody'));
        return;
      }
      let body = t('subscription.changeUnchanged');
      if (e?.status === 404 || e?.code === 'subscription-not-found') {
        body = t('subscription.changeNotOwned');
      } else if (e?.status === 503 || e?.code === 'subscription-unavailable') {
        body = t('subscription.changeStoreDown');
      } else if (e?.status === 400 || e?.code === 'subscription-invalid') {
        body = t('subscription.changeInvalid');
      } else if (e?.code === 'E_OFFER_UNAVAILABLE' || e?.code === 'E_ITEM_UNAVAILABLE') {
        body = t('subscription.offerUnavailable');
      } else if (e?.code === 'E_VERIFY_TIMEOUT' || e?.code === 'E_TIMEOUT') {
        body = t('subscription.verifyTimeoutBody');
      } else if (e?.code === 'E_PENDING') {
        body = t('subscription.notActiveBody');
      } else if (e?.message) {
        body = e.message;
      }
      Alert.alert(t('subscription.changeFailedTitle'), body);
    } finally {
      if (isMounted.current) setPurchasing(false);
    }
  }, [pendingLine, purchasing, refreshDetails, restoring, showUnavailableAlert, t]);

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
          <Text style={styles.subtitle}>{t('subscription.letsGetStarted')}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{titleLabel}</Text>

        <View style={styles.plansStack}>
          {summaryLoading && !summary ? (
            <ActivityIndicator color="#fff" style={styles.planLoading} />
          ) : summaryError && !summary ? (
            <View style={styles.planCard}>
              <Text style={styles.planSubtitle}>{summaryError}</Text>
              <TouchableOpacity style={styles.changeButton} onPress={() => { void refreshDetails(); }}>
                <Text style={styles.changeButtonText}>{t('subscription.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : managementRows.length > 0 || summary?.has_active_subscription ? (
            <>
              {managementRows.map((row) => (
                <View key={row.id} style={[styles.planCard, styles.planCardSpacing]}>
                  <Text style={styles.planLabel}>{planLabel(row.plan)}</Text>
                  {rowLines(row).map((line) => (
                    <Text key={line} style={styles.planSubtitle}>{line}</Text>
                  ))}
                  {row.provider === 'google' && row.can_change_plan
                    ? (row.available_changes || []).map((change) => {
                        const price = priceFor(change.product_id, change.base_plan_id, false);
                        const period = change.plan === 'yearly'
                          ? t('subscription.perYear')
                          : t('subscription.perMonth');
                        return (
                          <TouchableOpacity
                            key={change.product_id}
                            style={styles.changeButton}
                            disabled={purchasing || restoring}
                            onPress={() => { void handleChangePlan(row, change); }}
                          >
                            <Text style={styles.changeButtonText}>
                              {t('subscription.changeTo', { plan: planLabel(change.plan) })}
                            </Text>
                            {price ? (
                              <Text style={styles.changePrice}>{price} {period}</Text>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })
                    : null}
                  {row.manage_url ? (
                    <TouchableOpacity
                      style={styles.restoreLinkHit}
                      onPress={() => openManage(row.manage_url as string)}
                    >
                      <Text style={styles.restoreLink}>{t('subscription.manage')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              {managementRows.length === 0 && summary?.has_active_subscription ? (
                <View style={styles.planCard}>
                  <Text style={styles.planLabel}>{t('subscription.planNamePremium')}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              {productError ? (
                <View style={[styles.planCard, styles.planCardSpacing]}>
                  <Text style={styles.planSubtitle}>{productError}</Text>
                  <TouchableOpacity style={styles.changeButton} onPress={() => { void loadProducts(); }}>
                    <Text style={styles.changeButtonText}>{t('subscription.retry')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {productsLoading && products.length === 0 ? (
                <ActivityIndicator color="#fff" style={styles.planLoading} />
              ) : products.length > 0 ? (
                <>
                  <PlanCard
                    label={t('subscription.planMonthly')}
                    subtitle={
                      monthlyHasTrial
                        ? monthlyTrialDays
                          ? t('subscription.trialDays', { count: monthlyTrialDays })
                          : t('subscription.trialGeneric')
                        : t('subscription.monthlyBilling')
                    }
                    priceLabel={monthlyOffer.priceLabel || '—'}
                    periodLabel={t('subscription.perMonth')}
                    selected={selectedPlan === 'monthly'}
                    onSelect={() => setSelectedPlan('monthly')}
                    disabled={purchasing || restoring || !monthlyOffer.offerToken}
                    style={styles.planCardSpacing}
                  />
                  <PlanCard
                    label={t('subscription.planYearly')}
                    badgeText={t('subscription.bestValue')}
                    subtitle={t('subscription.yearlyBilling')}
                    priceLabel={yearlyOffer.priceLabel || '—'}
                    periodLabel={t('subscription.perYear')}
                    selected={selectedPlan === 'yearly'}
                    onSelect={() => setSelectedPlan('yearly')}
                    disabled={purchasing || restoring || !yearlyOffer.offerToken}
                    style={undefined}
                  />
                </>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.spacer} />

        {showPurchase ? (
          <>
            <Text style={styles.secureText}>{t('subscription.securedPlayStore')}</Text>
            <TouchableOpacity
              style={styles.ctaButton}
              activeOpacity={0.9}
              onPress={handleStart}
              disabled={purchasing || restoring || !selectedReady}
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
                  <Text style={styles.ctaText} numberOfLines={2}>{ctaLabel}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.note}>{noteLabel}</Text>
          </>
        ) : null}

        <TouchableOpacity
          style={styles.restoreLinkHit}
          onPress={handleRestore}
          disabled={purchasing || restoring}
        >
          {restoring ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.restoreLink}>{t('subscription.restore')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerLinks}>
          <TouchableOpacity style={styles.linkHit} onPress={() => router.push('/terms')}>
            <Text style={styles.link}>{t('legalLinks.terms')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkHit} onPress={() => router.push('/privacy')}>
            <Text style={styles.link}>{t('legalLinks.privacy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkHit} onPress={() => router.push('/subscription')}>
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
            {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  plansStack: {
    width: '100%',
    marginTop: 98,
  },
  planCardSpacing: { marginBottom: 12 },
  planLoading: { marginVertical: 28 },
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
  changeButton: {
    marginTop: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(178, 131, 237, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  changeButtonText: {
    color: '#fff',
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    textAlign: 'center',
  },
  changePrice: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'SFProDisplay-Regular',
  },
  spacer: { flex: 1, minHeight: 24 },
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
