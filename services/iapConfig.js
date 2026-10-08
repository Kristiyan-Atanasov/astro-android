// services/iapConfig.js
//
// Product / subscription identifiers configured in Google Play Console.
// These IDs MUST match exactly what is configured on the store dashboard.

const ANDROID_MONTHLY_SUB_ID = 'io.astroinsights.app.premium.monthly';
const ANDROID_YEARLY_SUB_ID = 'io.astroinsights.app.premium.yearly';

export const MONTHLY_SUBSCRIPTION_SKU = ANDROID_MONTHLY_SUB_ID;
export const YEARLY_SUBSCRIPTION_SKU = ANDROID_YEARLY_SUB_ID;
export const SUBSCRIPTION_SKUS = [ANDROID_MONTHLY_SUB_ID, ANDROID_YEARLY_SUB_ID];

// Play Console offer on the monthly base plan. Eligible new subscribers
// receive it; ineligible users only get the base plan (offer id empty).
export const MONTHLY_TRIAL_OFFER_ID = 'trial-7-days';
export const MONTHLY_BASE_PLAN_ID = 'monthly';
export const YEARLY_BASE_PLAN_ID = 'yearly';

// Kept for back-compat with existing call sites. Defaults to the
// monthly plan since that's been the only option historically.
export const DEFAULT_SUBSCRIPTION_SKU = MONTHLY_SUBSCRIPTION_SKU;
