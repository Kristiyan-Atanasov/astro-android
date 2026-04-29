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

export const SUBSCRIPTION_SKUS = Platform.select({
  ios: [IOS_MONTHLY_SUB_ID],
  android: [ANDROID_MONTHLY_SUB_ID],
  default: [IOS_MONTHLY_SUB_ID],
});

export const DEFAULT_SUBSCRIPTION_SKU = Platform.select({
  ios: IOS_MONTHLY_SUB_ID,
  android: ANDROID_MONTHLY_SUB_ID,
  default: IOS_MONTHLY_SUB_ID,
});
