import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import data from '../assets/data/insights.json';
import { handleFacebookLogin } from '../services/handleFacebookLogin';
import { handleGoogleSignIn } from '../services/handleGoogleLogin';


export default function SignInScreen() {
  const router = useRouter();
  const links = data.welcome.links;
  const { login: handleGoogleLogin } = handleGoogleSignIn();
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      console.log('Apple login success:', credential);
    } catch (e) {
      console.log('Apple login failed:', e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../assets/images/signin-graphic.png')}
          style={styles.image}
          resizeMode="contain"
        />

        <Text style={styles.title}>Welcome to{"\n"}AstroInsights</Text>
        <Text style={styles.subtitle}>
          Begin your journey of personal transformation
        </Text>

        {appleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={30}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}

<TouchableOpacity
  style={styles.facebookButton}
  onPress={() => handleFacebookLogin(router)}
>
  <Text style={styles.facebookText}>Sign in with Facebook</Text>
</TouchableOpacity>

<View style={styles.socialButtons}>
  <TouchableOpacity
    style={styles.socialButton}
    onPress={handleGoogleLogin}
  >
    <Text style={styles.googleText}>Sign in with Google</Text>
  </TouchableOpacity>
</View>

      </View>

      {/* Footer links */}
      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={() => router.push(links[0].route)}>
          <Text style={styles.link}>{links[0].label}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push(links[1].route)}>
          <Text style={styles.link}>{links[1].label}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push(links[2].route)}>
          <Text style={styles.link}>{links[2].label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 30,
    backgroundColor: 'transparent',
  },
  content: {
    alignItems: 'center',
    flexGrow: 1,
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  title: {
    fontSize: 35,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#fff',
    marginBottom: 30,
    fontFamily: 'Nunito-Regular',
  },
  appleButton: {
    width: 328,
    height: 60,
    marginBottom: 15,
  },
  facebookButton: {
    width: 328,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#4267B2',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  facebookText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  socialButtons: {
    width: 328,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  socialButton: {
    width: 328,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  googleText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  linksContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  link: {
    fontSize: 12,
    lineHeight: 12,
    textAlign: 'center',
    color: '#ccc',
    textDecorationLine: 'underline',
    marginHorizontal: 5,
    fontFamily: 'Nunito-Regular',
  },
});
