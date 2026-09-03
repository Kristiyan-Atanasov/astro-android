// services/iapConfig.js
//
// Product / subscription identifiers configured in Google Play Console.
// These IDs MUST match exactly what is configured on the store dashboard.

const ANDROID_MONTHLY_SUB_ID = 'io.astroinsights.app.premium.monthly';
const ANDROID_YEARLY_SUB_ID = 'io.astroinsights.app.premium.yearly';

export const MONTHLY_SUBSCRIPTION_SKU = ANDROID_MONTHLY_SUB_ID;
export const YEARLY_SUBSCRIPTION_SKU = ANDROID_YEARLY_SUB_ID;
export const SUBSCRIPTION_SKUS = [ANDROID_MONTHLY_SUB_ID, ANDROID_YEARLY_SUB_ID];

// Kept for back-compat with existing call sites. Defaults to the
// monthly plan since that's been the only option historically.
export const DEFAULT_SUBSCRIPTION_SKU = MONTHLY_SUBSCRIPTION_SKU;
