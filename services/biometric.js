// services/biometric.js
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_PREF_KEY = 'biometricEnabled';

export async function isBiometricSupported() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return !!enrolled;
  } catch (e) {
    console.log('biometric support check failed:', e?.message ?? String(e));
    return false;
  }
}

export async function getBiometricLabel() {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (
      Array.isArray(types) &&
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ) {
      return 'Face ID';
    }
    if (
      Array.isArray(types) &&
      types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    ) {
      return 'Touch ID';
    }
    if (
      Array.isArray(types) &&
      types.includes(LocalAuthentication.AuthenticationType.IRIS)
    ) {
      return 'Iris';
    }
  } catch (e) {
    console.log('biometric label check failed:', e?.message ?? String(e));
  }
  return 'Biometrics';
}

export async function isBiometricEnabled() {
  try {
    const v = await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled) {
  try {
    if (enabled) {
      await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, '1');
    } else {
      await SecureStore.deleteItemAsync(BIOMETRIC_PREF_KEY);
    }
  } catch (e) {
    console.log('biometric pref save failed:', e?.message ?? String(e));
  }
}

export async function authenticateWithBiometric(promptMessage) {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage ?? 'Sign in to AstroInsights',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });
    return { success: !!result.success, error: result.error ?? null };
  } catch (e) {
    return { success: false, error: e?.message ?? String(e) };
  }
}
