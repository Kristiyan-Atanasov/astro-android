import { sendSocialLoginToken } from '../services/api';

const handleAppleSignIn = async () => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { identityToken } = credential;

    if (!identityToken) {
      console.warn('No Apple ID token found.');
      return;
    }

    // Send token to backend
    const response = await sendSocialLoginToken('apple', identityToken);

    if (response.success) {
      console.log('✅ Logged in via backend');
      router.push('/onboarding/name');
    } else {
      console.log('❌ Backend rejected Apple login');
    }
  } catch (e) {
    console.error('Apple login failed:', e);
  }
};
