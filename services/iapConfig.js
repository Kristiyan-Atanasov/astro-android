// services/iapConfig.js
//
// Product / subscription identifiers configured in App Store Connect
// (iOS) and Google Play Console (Android). These IDs MUST match
// exactly what is configured on each store dashboard.
//
// Convention:
//   - iOS uses a single product ID; multiple price plans live under
//     the same subscription group.
//   - Android subscription IDs may also expose multiple base plan
//     offers (e.g. monthly with free trial).

import { Platform } from 'react-native';

const IOS_MONTHLY_SUB_ID = 'io.astroinsights.app.premium.monthly';
const ANDROID_MONTHLY_SUB_ID = 'io.astroinsights.app.premium.monthly';

const IOS_YEARLY_SUB_ID = 'io.astroinsights.app.premium.yearly';
const ANDROID_YEARLY_SUB_ID = 'io.astroinsights.app.premium.yearly';

export const MONTHLY_SUBSCRIPTION_SKU = Platform.select({
  ios: IOS_MONTHLY_SUB_ID,
  android: ANDROID_MONTHLY_SUB_ID,
  default: IOS_MONTHLY_SUB_ID,
});

export const YEARLY_SUBSCRIPTION_SKU = Platform.select({
  ios: IOS_YEARLY_SUB_ID,
  android: ANDROID_YEARLY_SUB_ID,
  default: IOS_YEARLY_SUB_ID,
});

export const SUBSCRIPTION_SKUS = Platform.select({
  ios: [IOS_MONTHLY_SUB_ID, IOS_YEARLY_SUB_ID],
  android: [ANDROID_MONTHLY_SUB_ID, ANDROID_YEARLY_SUB_ID],
  default: [IOS_MONTHLY_SUB_ID, IOS_YEARLY_SUB_ID],
});

// Kept for back-compat with existing call sites. Defaults to the
// monthly plan since that's been the only option historically.
export const DEFAULT_SUBSCRIPTION_SKU = MONTHLY_SUBSCRIPTION_SKU;
