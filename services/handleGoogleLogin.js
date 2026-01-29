import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { sendSocialLoginToken } from './api';

WebBrowser.maybeCompleteAuthSession();

export const handleGoogleSignIn = (router) => {   // <--- accept router here
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '746806622681-su657pbaubv15h7j1e0gdf9dkp3mqqlf.apps.googleusercontent.com',
    iosClientId: '746806622681-su657pbaubv15h7j1e0gdf9dkp3mqqlf.apps.googleusercontent.com',
    androidClientId: '746806622681-su657pbaubv15h7j1e0gdf9dkp3mqqlf.apps.googleusercontent.com',
    webClientId: '746806622681-su657pbaubv15h7j1e0gdf9dkp3mqqlf.apps.googleusercontent.com',
  });

  const login = async () => {
    try {
      const result = await promptAsync();

      if (result?.type !== 'success') {
        console.log('❌ Google login cancelled or failed');
        return;
      }

      const idToken = result.authentication?.idToken;

      if (!idToken) {
        console.warn('❌ No ID Token received from Google.');
        return;
      }

      // ✅ Send the token to backend manually
      const backendResponse = await sendSocialLoginToken('google', idToken);

      if (backendResponse.success) {
        console.log('✅ Google login success');
        router.push('/onboarding/name');  // <--- now you can navigate
      } else {
        console.error('❌ Backend rejected Google login');
      }
    } catch (error) {
      console.error('❌ Error during Google login:', error.message);
    }
  };

  return { login };
};
