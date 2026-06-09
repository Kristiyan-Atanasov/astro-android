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
import { makeRedirectUri } from "expo-auth-session";

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

// Required for the Google OAuth web-flow popup to dismiss correctly when
// the deep link comes back into the app.
WebBrowser.maybeCompleteAuthSession();

// --- Provider config -------------------------------------------------------

const WEB_CLIENT_ID =
  "154762470670-dma1hg357n6n48ishn1b4gjodo33v08r.apps.googleusercontent.com";

const IOS_CLIENT_ID =
  "154762470670-n099k64j893h5qr85lrhh85fiutk533e.apps.googleusercontent.com";

type ProviderId = "google" | "apple";

// --- Screen ----------------------------------------------------------------

export default function SignInScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // Submitting state per provider so we can show a spinner only on the
  // button that was tapped while still letting the user pick another one
  // if the first popup was cancelled.
  const [submitting, setSubmitting] = React.useState<ProviderId | null>(null);
  const [appleAvailable, setAppleAvailable] = React.useState(false);

  // ---- Google ----
  const APP_SCHEME =
    "com.googleusercontent.apps.154762470670-n099k64j893h5qr85lrhh85fiutk533e";

  const googleRedirectUri = makeRedirectUri({
    native: `${APP_SCHEME}:/signin`,
  });

  const [googleRequest, googleResponse, promptGoogle] =
    Google.useIdTokenAuthRequest({
      iosClientId: IOS_CLIENT_ID,
      webClientId: WEB_CLIENT_ID,
      redirectUri: googleRedirectUri,
      scopes: ["openid", "profile", "email"],
    });

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

  // ---- Google response handler ----
  React.useEffect(() => {
    if (!googleResponse || submitting !== "google") return;

    if (googleResponse.type === "success") {
      const idToken = (googleResponse.params as any)?.id_token;
      if (!idToken) {
        Alert.alert(
          t("signin.googleFailed"),
          "No id_token returned from Google."
        );
        setSubmitting(null);
        return;
      }
      finishSocialLogin("google", idToken).finally(() => setSubmitting(null));
      return;
    }

    if (googleResponse.type === "error") {
      Alert.alert(
        t("signin.googleFailed"),
        googleResponse.error?.message ?? "Unknown error"
      );
    }
    // For "cancel" / "dismiss" we silently reset.
    setSubmitting(null);
  }, [googleResponse, finishSocialLogin, submitting, t]);

  // ---- Button handlers ----

  const onPressGoogle = async () => {
    if (submitting || !googleRequest) return;
    setSubmitting("google");
    try {
      await promptGoogle({ useProxy: false } as any);
    } catch (e: any) {
      Alert.alert(t("signin.googleFailed"), e?.message ?? String(e));
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
          source={require("../assets/images/signin-graphic.png")}
          style={styles.image}
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

        <TouchableOpacity
          style={styles.providerButton}
          onPress={onPressGoogle}
          disabled={!googleRequest || submitting !== null}
        >
          {submitting === "google" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.providerText}>{t("signin.google")}</Text>
          )}
        </TouchableOpacity>
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
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: 20,
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
