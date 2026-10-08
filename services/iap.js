// services/iap.js
//
// Thin wrapper around react-native-iap that:
//   - manages the store connection lifecycle
//   - exposes purchase / restore helpers
//   - forwards every successful purchase to the backend
//     verify endpoint and only finishes the transaction once
//     the backend confirms it
//
// Backend is treated as the source of truth: we NEVER unlock
// premium UI from a raw store success — we only unlock once
// POST /payments/verify/ returns a non-locked status.

import { Platform } from 'react-native';

import { verifySubscription } from './api';
import {
  SUBSCRIPTION_SKUS,
  DEFAULT_SUBSCRIPTION_SKU,
  MONTHLY_SUBSCRIPTION_SKU,
  YEARLY_SUBSCRIPTION_SKU,
  MONTHLY_TRIAL_OFFER_ID,
  MONTHLY_BASE_PLAN_ID,
  YEARLY_BASE_PLAN_ID,
} from './iapConfig';

const IAP_SUPPORTED = Platform.OS === 'android';

// Lazily require the native module. On web (or any unsupported
// platform) we never touch the import so that bundling does not
// break, and calling any method below throws a friendly error.
let RNIap = null;
if (IAP_SUPPORTED) {
  try {
    RNIap = require('react-native-iap');
  } catch (e) {
    console.log('⚠️ react-native-iap require failed:', e?.message ?? String(e));
  }
}

function ensureIapAvailable() {
  if (!RNIap) {
    throw new Error('In-app purchases are not available on this device.');
  }
}

// `RNIap.initConnection()` can hang on misconfigured Play Billing
// setups. Without a deadline the upgrade page appears frozen — give
// the native module a budget then bail so the screen stays usable.
const INIT_CONNECTION_TIMEOUT_MS = 6000;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      err.code = 'E_NOT_PREPARED';
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

let connectionPromise = null;
let purchaseUpdateSub = null;
let purchaseErrorSub = null;

// While a purchase / restore flow is in progress, these resolvers
// receive the next purchase / error event from the native listeners.
let activeFlow = null; // { resolve, reject, type: 'purchase' | 'restore' }

function buildReceiptPayload(purchase) {
  if (!purchase || typeof purchase !== 'object') return null;

  return {
    product_id: purchase.productId,
    package_name: purchase.packageNameAndroid,
    purchase_token: purchase.purchaseToken,
    transaction_id: purchase.transactionId,
    transaction_date: purchase.transactionDate,
    is_acknowledged: purchase.isAcknowledgedAndroid,
    purchase_state: purchase.purchaseState,
    receipt: purchase.purchaseToken,
    signature_android: purchase.signatureAndroid,
  };
}

async function handlePurchaseEvent(purchase) {
  if (!purchase) return;

  console.log('🛒 IAP purchaseUpdated:', {
    productId: purchase.productId,
    transactionId: purchase.transactionId,
    purchaseState: purchase.purchaseState,
  });

  // An unpaid pending purchase must not be verified or finished. Google
  // redelivers it if it later completes. The product id on that later
  // purchase may still be the current plan while a deferred change is
  // only scheduled — verification accepts whichever id Play returns.
  if (purchase.purchaseState === 'pending') {
    if (activeFlow) {
      const err = new Error('The purchase is still pending.');
      err.code = 'E_PENDING';
      activeFlow.reject(err);
      activeFlow = null;
    }
    return;
  }

  const provider = 'google';
  const receiptPayload = buildReceiptPayload(purchase);

  if (!receiptPayload) {
    if (activeFlow) {
      activeFlow.reject(new Error('Empty purchase payload from store.'));
      activeFlow = null;
    }
    return;
  }

  try {
    const verifyResult = await verifySubscription(provider, receiptPayload);
    console.log('✅ Subscription verify result:', verifyResult);

    try {
      await RNIap.finishTransaction({ purchase, isConsumable: false });
    } catch (finishErr) {
      console.log('⚠️ finishTransaction error:', finishErr?.message ?? String(finishErr));
    }

    if (activeFlow) {
      activeFlow.resolve(verifyResult);
      activeFlow = null;
    }
  } catch (verifyErr) {
    console.log('❌ Subscription verify error:', verifyErr?.message ?? String(verifyErr));

    // Do NOT finish the transaction on verify failure — Google Play
    // will redeliver it next launch so we can retry verification.

    if (activeFlow) {
      activeFlow.reject(verifyErr);
      activeFlow = null;
    }
  }
}

function handlePurchaseError(error) {
  console.log('❌ IAP purchaseError:', error?.message ?? error?.code ?? String(error));
  if (activeFlow) {
    activeFlow.reject(error || new Error('Purchase failed'));
    activeFlow = null;
  }
}

// Lazily connects to the store and registers the purchase listeners.
// Calling this multiple times is safe.
export async function initIap() {
  if (!IAP_SUPPORTED || !RNIap) {
    console.log('[IAP] initIap() skipped (unsupported platform or RNIap missing)', {
      platform: Platform.OS,
      hasRNIap: !!RNIap,
    });
    return false;
  }
  if (connectionPromise) {
    console.log('[IAP] initIap() reusing in-flight connection');
    return connectionPromise;
  }

  console.log('[IAP] initIap() starting fresh connection');
  connectionPromise = (async () => {
    try {
      await withTimeout(
        RNIap.initConnection(),
        INIT_CONNECTION_TIMEOUT_MS,
        'IAP initConnection',
      );
      console.log('[IAP] initConnection() resolved');
    } catch (e) {
      console.log('[IAP] initConnection error:', {
        code: e?.code,
        message: e?.message ?? String(e),
      });
      connectionPromise = null;
      throw e;
    }

    if (Platform.OS === 'android') {
      try {
        // Clears any unacknowledged transactions from a previous broken session
        await RNIap.flushFailedPurchasesCachedAsPendingAndroid?.();
      } catch (e) {
        console.log('⚠️ IAP flush android error:', e?.message ?? String(e));
      }
    }

    if (!purchaseUpdateSub) {
      purchaseUpdateSub = RNIap.purchaseUpdatedListener(handlePurchaseEvent);
    }
    if (!purchaseErrorSub) {
      purchaseErrorSub = RNIap.purchaseErrorListener(handlePurchaseError);
    }

    return true;
  })();

  return connectionPromise;
}

export async function endIap() {
  if (!RNIap) return;
  if (purchaseUpdateSub) {
    try { purchaseUpdateSub.remove(); } catch {}
    purchaseUpdateSub = null;
  }
  if (purchaseErrorSub) {
    try { purchaseErrorSub.remove(); } catch {}
    purchaseErrorSub = null;
  }
  try {
    await RNIap.endConnection();
  } catch (e) {
    console.log('⚠️ IAP endConnection error:', e?.message ?? String(e));
  }
  connectionPromise = null;
}

// Loads the subscription products from the store so the UI can
// display the localized price from the selected offer. Failures are
// rethrown with their original code and message.
const GET_SUBSCRIPTIONS_TIMEOUT_MS = 8000;

function productIdsOf(products) {
  if (!Array.isArray(products)) return [];
  return products.map((product) => product?.id).filter((id) => typeof id === 'string' && id);
}

export async function loadSubscriptionProducts(skus = SUBSCRIPTION_SKUS) {
  console.log('[IAP] loadSubscriptionProducts() called', { skus });
  if (!RNIap) {
    const err = new Error('In-app purchases are not available on this device.');
    err.code = 'E_IAP_NOT_AVAILABLE';
    throw err;
  }
  await initIap();
  console.log('[IAP] fetchProducts() start', { skus, type: 'subs' });
  try {
    const subs = await withTimeout(
      RNIap.fetchProducts({ skus, type: 'subs' }),
      GET_SUBSCRIPTIONS_TIMEOUT_MS,
      'IAP fetchProducts',
    );
    const list = Array.isArray(subs) ? subs : [];
    console.log('[IAP] fetchProducts() done', {
      count: list.length,
      ids: productIdsOf(list),
    });
    return list;
  } catch (e) {
    console.log('[IAP] fetchProducts error:', {
      code: e?.code ?? null,
      message: e?.message ?? String(e),
    });
    throw e;
  }
}

function listPlayOffers(product) {
  const standardized = Array.isArray(product?.subscriptionOffers)
    ? product.subscriptionOffers
    : [];
  const fromStandard = standardized
    .map((offer) => ({
      id: typeof offer?.id === 'string' ? offer.id : '',
      basePlanId:
        (typeof offer?.basePlanIdAndroid === 'string' && offer.basePlanIdAndroid) ||
        (typeof offer?.basePlanId === 'string' && offer.basePlanId) ||
        '',
      offerToken: offer?.offerTokenAndroid || '',
      displayPrice: typeof offer?.displayPrice === 'string' ? offer.displayPrice : '',
      phases:
        offer?.pricingPhasesAndroid?.pricingPhaseList ||
        offer?.pricingPhases?.pricingPhaseList ||
        [],
      paymentMode: offer?.paymentMode || null,
      period: offer?.period || null,
    }))
    .filter((offer) => offer.offerToken);

  if (fromStandard.length > 0) return fromStandard;

  const legacy = Array.isArray(product?.subscriptionOfferDetailsAndroid)
    ? product.subscriptionOfferDetailsAndroid
    : [];
  return legacy
    .map((offer) => ({
      id: typeof offer?.offerId === 'string' ? offer.offerId : '',
      basePlanId: typeof offer?.basePlanId === 'string' ? offer.basePlanId : '',
      offerToken: offer?.offerToken || '',
      displayPrice: '',
      phases: offer?.pricingPhases?.pricingPhaseList || [],
      paymentMode: null,
      period: null,
    }))
    .filter((offer) => offer.offerToken);
}

function isFreePhase(phase) {
  const micros = Number(phase?.priceAmountMicros);
  if (Number.isFinite(micros)) return micros === 0;
  const formatted = String(phase?.formattedPrice || '').trim().toLowerCase();
  return formatted === 'free' || formatted === 'безплатно';
}

function daysFromBillingPeriod(period) {
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(
    String(period || ''),
  );
  if (!match) return null;
  const years = Number(match[1] || 0);
  const months = Number(match[2] || 0);
  const weeks = Number(match[3] || 0);
  const days = Number(match[4] || 0);
  const total = years * 365 + months * 30 + weeks * 7 + days;
  return total > 0 ? total : null;
}

function daysFromPeriod(period) {
  if (!period || typeof period !== 'object') return null;
  const value = Number(period.value);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (period.unit === 'day') return value;
  if (period.unit === 'week') return value * 7;
  if (period.unit === 'month') return value * 30;
  if (period.unit === 'year') return value * 365;
  return null;
}

function paidPhase(offer) {
  const phases = Array.isArray(offer?.phases) ? offer.phases : [];
  return [...phases].reverse().find((phase) => phase?.formattedPrice && !isFreePhase(phase)) || null;
}

function freePhase(offer) {
  const phases = Array.isArray(offer?.phases) ? offer.phases : [];
  return phases.find((phase) => isFreePhase(phase)) || null;
}

function offersForBasePlan(offers, basePlanId) {
  if (!basePlanId) return offers;
  if (!offers.some((offer) => offer.basePlanId)) return offers;
  return offers.filter((offer) => offer.basePlanId === basePlanId);
}

function isRegularBasePlanOffer(offer) {
  if (offer.id) return false;
  if (offer.paymentMode === 'free-trial') return false;
  if (freePhase(offer)) return false;
  return true;
}

// Monthly: trial-7-days on base plan "monthly" when Play returned it.
// Otherwise that base plan's regular offer (no offer id). Yearly and plan
// changes pass allowTrial false and the target base plan id. Never [0].
export function selectSubscriptionOffer(product, { allowTrial = false, basePlanId = '' } = {}) {
  const offers = offersForBasePlan(listPlayOffers(product), basePlanId);
  if (allowTrial && (!basePlanId || basePlanId === MONTHLY_BASE_PLAN_ID)) {
    const trial = offers.find(
      (offer) =>
        offer.id === MONTHLY_TRIAL_OFFER_ID &&
        (!offer.basePlanId || offer.basePlanId === MONTHLY_BASE_PLAN_ID),
    );
    if (trial) return trial;
  }
  return offers.find((offer) => isRegularBasePlanOffer(offer)) || null;
}

export function describeSubscriptionProduct(product, { allowTrial = false, basePlanId = '' } = {}) {
  const empty = {
    offerToken: null,
    offerId: '',
    priceLabel: '',
    hasTrial: false,
    trialDays: null,
  };
  if (!product) return empty;

  const offer = selectSubscriptionOffer(product, { allowTrial, basePlanId });
  if (!offer) {
    return {
      ...empty,
      priceLabel: typeof product.displayPrice === 'string' ? product.displayPrice : '',
    };
  }

  const paid = paidPhase(offer);
  const trial = offer.id === MONTHLY_TRIAL_OFFER_ID ? freePhase(offer) : null;
  const trialDays = trial
    ? daysFromBillingPeriod(trial.billingPeriod) || daysFromPeriod(offer.period)
    : offer.paymentMode === 'free-trial'
      ? daysFromPeriod(offer.period)
      : null;

  return {
    offerToken: offer.offerToken,
    offerId: offer.id,
    priceLabel:
      paid?.formattedPrice ||
      offer.displayPrice ||
      (typeof product.displayPrice === 'string' ? product.displayPrice : ''),
    hasTrial: offer.id === MONTHLY_TRIAL_OFFER_ID,
    trialDays,
  };
}

// Starts a new subscription. Does not replace an existing plan — that
// path is purchaseDeferredPlanChange, which must carry the current
// purchase token and deferred replacement parameters.
export async function purchaseSubscription(sku = DEFAULT_SUBSCRIPTION_SKU) {
  ensureIapAvailable();
  await initIap();

  let products;
  try {
    products = await RNIap.fetchProducts({ skus: [sku], type: 'subs' });
  } catch (e) {
    console.log('[IAP] fetchProducts error:', {
      code: e?.code ?? null,
      message: e?.message ?? String(e),
    });
    throw e;
  }

  const ids = productIdsOf(products);
  console.log('[IAP] fetchProducts result:', { ids });

  const productMatch = (products || []).find((p) => p.id === sku);
  if (!productMatch) {
    const err = new Error(
      `The subscription "${sku}" isn’t available from the store yet. ` +
      `Make sure it’s created and active in Play Console and that you’re testing with a license tester account.`,
    );
    err.code = 'E_ITEM_UNAVAILABLE';
    throw err;
  }

  const basePlanId = sku === YEARLY_SUBSCRIPTION_SKU
    ? YEARLY_BASE_PLAN_ID
    : MONTHLY_BASE_PLAN_ID;
  const allowTrial = sku === MONTHLY_SUBSCRIPTION_SKU;
  const selectedOffer = selectSubscriptionOffer(productMatch, { allowTrial, basePlanId });
  if (!selectedOffer?.offerToken) {
    console.log('[IAP] no matching offer', {
      sku,
      basePlanId,
      allowTrial,
      offers: listPlayOffers(productMatch).map((offer) => ({
        id: offer.id || '(base plan)',
        basePlanId: offer.basePlanId || '(none)',
      })),
    });
    const err = new Error(
      `Google Play didn’t return the ${basePlanId} price for "${sku}".`,
    );
    err.code = 'E_OFFER_UNAVAILABLE';
    throw err;
  }

  if (activeFlow) {
    throw new Error('Another purchase is already in progress.');
  }

  return new Promise((resolve, reject) => {
    activeFlow = { resolve, reject, type: 'purchase' };

    const request = {
      google: {
        skus: [sku],
        subscriptionOffers: [{ sku, offerToken: selectedOffer.offerToken }],
      },
    };

    console.log('[IAP] requestPurchase', {
      sku,
      basePlanId,
      offerId: selectedOffer.id || '(base plan)',
    });

    RNIap.requestPurchase({ request, type: 'subs' }).catch((err) => {
      console.log('🛒 IAP requestPurchase rejected:', err?.code, err?.message ?? String(err));
      if (activeFlow) {
        activeFlow.reject(err);
        activeFlow = null;
      }
    });
  });
}

// Deferred Google Play replacement. The new plan starts at the end of the
// current period: no immediate charge and no second subscription. The
// purchase token stays in memory for this call and is not logged.
export async function purchaseDeferredPlanChange(prepared) {
  const targetSku = prepared?.target_product_id;
  const currentSku = prepared?.current_product_id;
  const basePlanId = prepared?.target_base_plan_id;
  const purchaseToken = prepared?.purchase_token;
  const mode = String(prepared?.replacement_mode || '').toLowerCase();

  if (mode !== 'deferred') {
    const err = new Error('Plan changes must use deferred replacement.');
    err.code = 'E_REPLACEMENT_MODE';
    throw err;
  }
  if (!targetSku || !currentSku || !basePlanId || !purchaseToken) {
    const err = new Error('Plan change is missing checkout parameters.');
    err.code = 'E_OFFER_UNAVAILABLE';
    throw err;
  }

  ensureIapAvailable();
  await initIap();

  let products;
  try {
    products = await RNIap.fetchProducts({ skus: [targetSku], type: 'subs' });
  } catch (e) {
    console.log('[IAP] fetchProducts plan-change error:', {
      code: e?.code ?? null,
      message: e?.message ?? String(e),
      sku: targetSku,
    });
    throw e;
  }

  console.log('[IAP] fetchProducts plan-change result:', { ids: productIdsOf(products) });

  const productMatch = (products || []).find((p) => p.id === targetSku);
  if (!productMatch) {
    const err = new Error(`Google Play didn’t return "${targetSku}".`);
    err.code = 'E_ITEM_UNAVAILABLE';
    throw err;
  }

  const selectedOffer = selectSubscriptionOffer(productMatch, {
    allowTrial: false,
    basePlanId,
  });
  if (!selectedOffer?.offerToken) {
    console.log('[IAP] no base-plan offer for plan change', {
      sku: targetSku,
      basePlanId,
      offers: listPlayOffers(productMatch).map((offer) => ({
        id: offer.id || '(base plan)',
        basePlanId: offer.basePlanId || '(none)',
      })),
    });
    const err = new Error(
      `Google Play didn’t return the regular ${basePlanId} price for "${targetSku}".`,
    );
    err.code = 'E_OFFER_UNAVAILABLE';
    throw err;
  }

  if (activeFlow) {
    throw new Error('Another purchase is already in progress.');
  }

  return new Promise((resolve, reject) => {
    activeFlow = { resolve, reject, type: 'purchase' };

    const request = {
      google: {
        skus: [targetSku],
        purchaseToken,
        subscriptionOffers: [{ sku: targetSku, offerToken: selectedOffer.offerToken }],
        subscriptionProductReplacementParams: {
          oldProductId: currentSku,
          replacementMode: 'deferred',
        },
      },
    };

    console.log('[IAP] deferred plan change', {
      currentProductId: currentSku,
      targetProductId: targetSku,
      targetBasePlanId: basePlanId,
      offerId: selectedOffer.id || '(base plan)',
      replacementMode: 'deferred',
    });

    RNIap.requestPurchase({ request, type: 'subs' }).catch((err) => {
      console.log('🛒 IAP plan change rejected:', err?.code, err?.message ?? String(err));
      if (activeFlow) {
        activeFlow.reject(err);
        activeFlow = null;
      }
    });
  });
}

// Restores any previous active subscriptions for the signed-in store
// account and re-verifies them with the backend.
//
// Resolves with the backend verify result of the most recent valid
// purchase. Resolves with null if nothing to restore.
export async function restoreSubscriptions() {
  ensureIapAvailable();
  await initIap();

  let purchases = [];
  try {
    purchases = await RNIap.getAvailablePurchases();
  } catch (e) {
    console.log('⚠️ IAP getAvailablePurchases error:', e?.message ?? String(e));
    throw new Error('We couldn’t reach the store. Please try again.');
  }

  if (!purchases || purchases.length === 0) {
    return null;
  }

  const subscriptionPurchases = purchases.filter((p) =>
    SUBSCRIPTION_SKUS.includes(p.productId),
  );

  const ordered = subscriptionPurchases.length > 0 ? subscriptionPurchases : purchases;

  // Most recent transaction first.
  ordered.sort((a, b) => (b.transactionDate || 0) - (a.transactionDate || 0));

  const provider = 'google';

  let lastError = null;
  for (const purchase of ordered) {
    const receiptPayload = buildReceiptPayload(purchase);
    if (!receiptPayload) continue;

    try {
      const verifyResult = await verifySubscription(provider, receiptPayload);
      try {
        await RNIap.finishTransaction({ purchase, isConsumable: false });
      } catch (finishErr) {
        console.log('⚠️ finishTransaction restore error:', finishErr?.message ?? String(finishErr));
      }
      return verifyResult;
    } catch (e) {
      console.log('⚠️ restore verify failed for one purchase:', e?.message ?? String(e));
      lastError = e;
    }
  }

  if (lastError) throw lastError;
  return null;
}

export function isPremiumStatus(status) {
  return status === 'active' || status === 'in_grace_period';
}

// 'active' / 'inactive' when the backend sent has_active_subscription.
// That flag also covers premium granted by an admin, which has no Play
// purchase. 'unknown' means the field is absent, so older signals may apply.
export function profileSubscriptionState(profile) {
  if (!profile || typeof profile !== 'object') return 'unknown';
  if (typeof profile.has_active_subscription === 'boolean') {
    return profile.has_active_subscription ? 'active' : 'inactive';
  }
  return isUserPremiumFromProfile(profile) ? 'active' : 'unknown';
}


/**
 * Best-effort premium detection from the user profile payload.
 * Backends vary on field names; we accept the common ones.
 */
export function isUserPremiumFromProfile(profile) {
  if (!profile || typeof profile !== 'object') return false;

  if (
    profile.is_premium === true ||
    profile.has_premium === true ||
    profile.has_active_subscription === true ||
    profile.is_subscribed === true ||
    profile.is_pro === true
  ) {
    return true;
  }
  if (
    profile.is_premium === false ||
    profile.has_premium === false ||
    profile.has_active_subscription === false ||
    profile.is_subscribed === false
  ) {
    return false;
  }

  const candidates = [
    profile.subscription_status,
    profile.subscriptionStatus,
    profile.subscription?.status,
    profile.user_subscription?.status,
    profile.plan,
    profile.plan_type,
    profile.account_type,
    profile.tier,
  ];

  for (const raw of candidates) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const value = raw.trim().toLowerCase();
    if (
      isPremiumStatus(value) ||
      value === 'premium' ||
      value === 'paid' ||
      value === 'pro' ||
      value === 'subscribed'
    ) {
      return true;
    }
    if (
      value === 'free' ||
      value === 'locked' ||
      value === 'inactive' ||
      value === 'expired' ||
      value === 'cancelled' ||
      value === 'canceled'
    ) {
      return false;
    }
  }

  return false;
}

/**
 * Infer premium from user_qualities: if any paid (non free-tier) quality
 * is not LOCKED, the user has premium access.
 * Returns null when the list can't decide (empty / missing).
 */
export function isUserPremiumFromQualities(qualities) {
  if (!Array.isArray(qualities) || qualities.length === 0) return null;
  const paid = qualities.filter((q) => q && !q.is_free_tier);
  if (paid.length === 0) return null;
  return paid.some((q) => String(q.status || '').toUpperCase() !== 'LOCKED');
}
