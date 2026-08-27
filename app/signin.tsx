import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import {
  getUserProfile,
  isOnboardingComplete,
  socialLogin,
} from "../services/api";
import {
  getBiometricLabel,
  isBiometricEnabled,
  isBiometricSupported,
  setBiometricEnabled,
} from "../services/biometric";
import { syncDeviceTokenIfChanged } from "../services/notifications";

if (Platform.OS === "web") {
  WebBrowser.maybeCompleteAuthSession();
}

// --- Provider config -------------------------------------------------------

const WEB_CLIENT_ID =
  "154762470670-dma1hg357n6n48ishn1b4gjodo33v08r.apps.googleusercontent.com";

const IOS_CLIENT_ID =
  "154762470670-n099k64j893h5qr85lrhh85fiutk533e.apps.googleusercontent.com";

// Native Google Sign-In returns an ID token whose audience is the web client.
// The backend validates that token in /authentication/social_login/. Android
// authorization is linked in Google Cloud by package name + signing SHA-1.
if (Platform.OS !== "web") {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    offlineAccess: false,
  });
}

type ProviderId = "google" | "apple";

type WebGoogleButtonProps = {
  submitting: ProviderId | null;
  setSubmitting: React.Dispatch<React.SetStateAction<ProviderId | null>>;
  finishSocialLogin: (provider: ProviderId, providerToken: string) => Promise<void>;
  failureTitle: string;
  buttonLabel: string;
};

// Keep browser OAuth isolated in a web-only component. Calling Google's
// AuthSession hook from the native screen is what caused the Android crash:
// the hook requires androidClientId during render, before a button is tapped.
function WebGoogleSignInButton({
  submitting,
  setSubmitting,
  finishSocialLogin,
  failureTitle,
  buttonLabel,
}: WebGoogleButtonProps) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: WEB_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });

  React.useEffect(() => {
    if (!response || submitting !== "google") return;

    if (response.type === "success") {
      const idToken = response.params?.id_token;
      if (!idToken) {
        Alert.alert(failureTitle, "Google did not return an identity token.");
        setSubmitting(null);
        return;
      }
      finishSocialLogin("google", idToken).finally(() => setSubmitting(null));
      return;
    }

    if (response.type === "error") {
      Alert.alert(failureTitle, response.error?.message ?? "Unknown error");
    }
    setSubmitting(null);
  }, [failureTitle, finishSocialLogin, response, setSubmitting, submitting]);

  const onPress = async () => {
    if (submitting || !request) return;
    setSubmitting("google");
    try {
      await promptAsync();
    } catch (e: unknown) {
      Alert.alert(failureTitle, e instanceof Error ? e.message : String(e));
      setSubmitting(null);
    }
  };

  return (
    <TouchableOpacity
      style={styles.providerButton}
      onPress={onPress}
      disabled={!request || submitting !== null}
    >
      {submitting === "google" ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.providerText}>{buttonLabel}</Text>
      )}
    </TouchableOpacity>
  );
}

// --- Screen ----------------------------------------------------------------

export default function SignInScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // Submitting state per provider so we can show a spinner only on the
  // button that was tapped while still letting the user pick another one
  // if the first popup was cancelled.
  const [submitting, setSubmitting] = React.useState<ProviderId | null>(null);
  const [appleAvailable, setAppleAvailable] = React.useState(false);

  // ---- Apple ----
  React.useEffect(() => {
    let cancelled = false;
    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (!cancelled) setAppleAvailable(available);
      })
      .catch(() => {
        if (!cancelled) setAppleAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Shared: send the provider token to the backend, store JWT(s), then
  // optionally prompt for biometric and route the user.
  const finishSocialLogin = React.useCallback(
    async (provider: ProviderId, providerToken: string) => {
      try {
        await socialLogin(provider, providerToken);
      } catch (e: any) {
        Alert.alert(t("signin.loginFailed"), e?.message ?? String(e));
        return;
      }

      syncDeviceTokenIfChanged().catch((e) =>
        console.log(
          "Post-login device token sync failed:",
          e?.message ?? String(e)
        )
      );

      const profile = await getUserProfile();
      const next: Href = isOnboardingComplete(profile)
        ? "/home"
        : "/onboarding/language";

      try {
        const supported = await isBiometricSupported();
        const alreadyEnabled = await isBiometricEnabled();
        if (supported && !alreadyEnabled) {
          const label = await getBiometricLabel();
          Alert.alert(
            t("signin.enableBiometricTitle", { label }),
            t("signin.enableBiometricBody", { label }),
            [
              {
                text: t("common.notNow"),
                style: "cancel",
                onPress: () => router.replace(next),
              },
              {
                text: t("common.enable"),
                onPress: async () => {
                  await setBiometricEnabled(true);
                  router.replace(next);
                },
              },
            ],
            { cancelable: false }
          );
          return;
        }
      } catch (e) {
        console.log(
          "Biometric prompt failed:",
          (e as any)?.message ?? String(e)
        );
      }

      router.replace(next);
    },
    [router, t]
  );

  // ---- Button handlers ----

  const onPressGoogle = async () => {
    if (submitting) return;
    setSubmitting("google");
    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      const response = await GoogleSignin.signIn();
      if (response.type === "cancelled") return;

      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error("Google did not return an identity token.");
      }

      await finishSocialLogin("google", idToken);
    } catch (e: unknown) {
      // A repeated tap can race the native sheet. Treat it like a cancellation
      // instead of showing an alarming error to the user.
      if (isErrorWithCode(e) && e.code === statusCodes.IN_PROGRESS) return;

      const message = isErrorWithCode(e)
        ? e.message || `Google sign-in failed (${e.code}).`
        : e instanceof Error
          ? e.message
          : String(e);
      Alert.alert(t("signin.googleFailed"), message);
    } finally {
      setSubmitting(null);
    }
  };

  const onPressApple = async () => {
    if (submitting) return;
    setSubmitting("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const idToken = credential.identityToken;
      if (!idToken) {
        Alert.alert(
          t("signin.appleFailed"),
          "Apple did not return an identity token."
        );
        setSubmitting(null);
        return;
      }
      await finishSocialLogin("apple", idToken);
    } catch (e: any) {
      // ERR_REQUEST_CANCELED = user dismissed the sheet, don't alert.
      if (e?.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert(t("signin.appleFailed"), e?.message ?? String(e));
      }
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("../assets/images/logo-signin.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>{t("signin.title")}</Text>
        <Text style={styles.subtitle}>{t("signin.subtitle")}</Text>

        {/* Apple — first on iOS per Apple's HIG. Hidden if not supported. */}
        {appleAvailable && Platform.OS === "ios" ? (
          <TouchableOpacity
            style={styles.appleButton}
            onPress={onPressApple}
            disabled={submitting !== null}
          >
            {submitting === "apple" ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.appleText}>{t("signin.apple")}</Text>
            )}
          </TouchableOpacity>
        ) : null}

        {Platform.OS === "web" ? (
          <WebGoogleSignInButton
            submitting={submitting}
            setSubmitting={setSubmitting}
            finishSocialLogin={finishSocialLogin}
            failureTitle={t("signin.googleFailed")}
            buttonLabel={t("signin.google")}
          />
        ) : (
          <TouchableOpacity
            style={styles.providerButton}
            onPress={onPressGoogle}
            disabled={submitting !== null}
          >
            {submitting === "google" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.providerText}>{t("signin.google")}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={() => router.push("/terms" as Href)}>
          <Text style={styles.link}>{t("legalLinks.terms")}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/privacy" as Href)}>
          <Text style={styles.link}>{t("legalLinks.privacy")}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/subscription" as Href)}>
          <Text style={styles.link}>{t("legalLinks.subscription")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 30,
    backgroundColor: "transparent",
  },
  content: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 72,
    overflow: "visible",
  },
  logo: {
    width: 260,
    height: 260,
    marginBottom: 32,
  },
  title: {
    fontSize: 35,
    color: "#fff",
    fontFamily: "CooperLtBT-Bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#fff",
    marginBottom: 30,
    fontFamily: "Nunito-Regular",
  },
  appleButton: {
    width: 328,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  appleText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Nunito-Bold",
  },
  providerButton: {
    width: 328,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 12,
  },
  providerText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito-Bold",
  },
  linksContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  link: {
    fontSize: 12,
    lineHeight: 12,
    textAlign: "center",
    color: "#ccc",
    textDecorationLine: "underline",
    marginHorizontal: 5,
    fontFamily: "Nunito-Regular",
  },
});
