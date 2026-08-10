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
// /subscriptions/verify/ returns a non-locked status.

import { Platform } from 'react-native';

import { verifySubscription } from './api';
import { SUBSCRIPTION_SKUS, DEFAULT_SUBSCRIPTION_SKU } from './iapConfig';

const IAP_SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

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

// `RNIap.initConnection()` can hang forever on iOS simulators without a
// StoreKit configuration file and on certain iOS / react-native-iap
// version combinations. Without a deadline, the awaiting JS thread
// makes the upgrade page appear "crashed" (frozen). We give the native
// module a generous budget then bail out so the screen stays usable
// even if the store is misbehaving.
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

  if (Platform.OS === 'ios') {
    return {
      product_id: purchase.productId,
      transaction_id: purchase.transactionId,
      original_transaction_id: purchase.originalTransactionIdentifierIOS,
      transaction_date: purchase.transactionDate,
      receipt: purchase.purchaseToken,
    };
  }

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
  });

  const provider = Platform.OS === 'ios' ? 'apple' : 'google';
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

    // Do NOT finish the transaction on verify failure — Apple/Google
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
// display a real localized price / period if it wants to.
// Returns [] on failure rather than throwing.
const GET_SUBSCRIPTIONS_TIMEOUT_MS = 8000;

export async function loadSubscriptionProducts(skus = SUBSCRIPTION_SKUS) {
  console.log('[IAP] loadSubscriptionProducts() called', { skus });
  if (!RNIap) {
    console.log('[IAP] RNIap unavailable, returning empty list');
    return [];
  }
  try {
    await initIap();
    console.log('[IAP] fetchProducts() start', { skus, type: 'subs' });
    const subs = await withTimeout(
      RNIap.fetchProducts({ skus, type: 'subs' }),
      GET_SUBSCRIPTIONS_TIMEOUT_MS,
      'IAP fetchProducts',
    );
    console.log('[IAP] fetchProducts() done', {
      count: Array.isArray(subs) ? subs.length : 0,
      ids: Array.isArray(subs) ? subs.map((s) => s?.id) : null,
    });
    return Array.isArray(subs) ? subs : [];
  } catch (e) {
    console.log('[IAP] fetchProducts error:', {
      code: e?.code,
      message: e?.message ?? String(e),
    });
    return [];
  }
}

// Triggers the native purchase sheet for the given subscription SKU.
// Resolves with the backend verify result once Apple/Google has
// returned the purchase AND the backend has accepted it.
export async function purchaseSubscription(sku = DEFAULT_SUBSCRIPTION_SKU) {
  ensureIapAvailable();
  await initIap();

  // Apple/Google require us to fetch product info before we can request
  // a purchase. If the store doesn't know about this SKU we fail loudly
  // here, which tells the caller the product isn't configured.
  let products = [];
  try {
    products = await RNIap.fetchProducts({ skus: [sku], type: 'subs' });
  } catch (e) {
    console.log('⚠️ IAP fetchProducts before purchase error:', e?.message ?? String(e));
  }

  console.log('🛒 IAP fetchProducts result:', products?.map((p) => ({
    productId: p.id,
    price: p.displayPrice ?? p.price,
  })));

  const productMatch = (products || []).find((p) => p.id === sku);
  if (!productMatch) {
    const err = new Error(
      `The subscription "${sku}" isn’t available from the store yet. ` +
      `Make sure it’s created and active in App Store Connect (or Play Console) and that you’re testing with a sandbox / license tester account.`,
    );
    err.code = 'E_ITEM_UNAVAILABLE';
    throw err;
  }

  if (activeFlow) {
    throw new Error('Another purchase is already in progress.');
  }

  return new Promise((resolve, reject) => {
    activeFlow = { resolve, reject, type: 'purchase' };

    const baseOfferToken =
      Platform.OS === 'android'
        ? productMatch?.subscriptionOffers?.[0]?.offerTokenAndroid ??
          productMatch?.subscriptionOfferDetailsAndroid?.[0]?.offerToken
        : undefined;

    const request =
      Platform.OS === 'android'
        ? {
            google: baseOfferToken
              ? {
                  skus: [sku],
                  subscriptionOffers: [{ sku, offerToken: baseOfferToken }],
                }
              : { skus: [sku] },
          }
        : { apple: { sku } };

    console.log('🛒 IAP requestPurchase subscription params:', request);

    RNIap.requestPurchase({ request, type: 'subs' }).catch((err) => {
      console.log('🛒 IAP requestPurchase rejected:', err?.code, err?.message ?? String(err));
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

  const provider = Platform.OS === 'ios' ? 'apple' : 'google';

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
