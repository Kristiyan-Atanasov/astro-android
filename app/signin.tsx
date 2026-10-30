import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Alert } from "../components/AppAlert";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
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
import {
  acceptPublicContentTerms,
  hasAcceptedPublicContentTerms,
} from "../services/publicContentConsent";

if (Platform.OS === "web") {
  WebBrowser.maybeCompleteAuthSession();
}

// --- Provider config -------------------------------------------------------

const WEB_CLIENT_ID =
  "154762470670-dma1hg357n6n48ishn1b4gjodo33v08r.apps.googleusercontent.com";

// Native Google Sign-In returns an ID token whose audience is the web client.
// The backend validates that token in /authentication/social_login/. Android
// authorization is linked in Google Cloud by package name + signing SHA-1.
if (Platform.OS !== "web") {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
  });
}

const signinBg = require("../assets/images/signin-bg.jpg");

type ProviderId = "google";

type WebGoogleButtonProps = {
  submitting: ProviderId | null;
  setSubmitting: React.Dispatch<React.SetStateAction<ProviderId | null>>;
  finishSocialLogin: (provider: ProviderId, providerToken: string) => Promise<void>;
  failureTitle: string;
  buttonLabel: string;
  accepted: boolean;
  onBeforePrompt: () => Promise<boolean>;
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
  accepted,
  onBeforePrompt,
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
    if (!(await onBeforePrompt())) return;
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
      style={[styles.providerButton, !accepted && styles.providerMuted]}
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
  const [agreed, setAgreed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    hasAcceptedPublicContentTerms().then((accepted) => {
      if (!cancelled && accepted) setAgreed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const requireAgreement = async () => {
    if (!agreed) {
      Alert.alert(t("signin.agreeRequiredTitle"), t("signin.agreeRequiredBody"));
      return false;
    }
    try {
      await acceptPublicContentTerms();
    } catch {
      Alert.alert(t("signin.agreeRequiredTitle"), t("common.somethingWentWrong"));
      return false;
    }
    return true;
  };

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
    if (!(await requireAgreement())) return;
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


  return (
    <ImageBackground
      source={signinBg}
      style={styles.container}
      imageStyle={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.content}>
        <Image
          source={require("../assets/images/logo-signin.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>{t("signin.title")}</Text>
        <Text style={styles.subtitle}>{t("signin.subtitle")}</Text>

        <View style={styles.agreeBlock}>
          <View style={styles.agreeRow}>
            <TouchableOpacity
              onPress={() => setAgreed((current) => !current)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
            >
              <View style={[styles.agreeBox, agreed && styles.agreeBoxOn]}>
                {agreed ? <Text style={styles.agreeTick}>✓</Text> : null}
              </View>
            </TouchableOpacity>
            <View style={styles.agreeCopy}>
              <Text style={styles.agreeText}>
                {t("signin.agreeLead")}
                <Text
                  style={styles.agreeLink}
                  onPress={() => router.push("/terms" as Href)}
                >
                  {t("legalLinks.terms")}
                </Text>
              </Text>
              <Text style={styles.agreeText}>
                {t("signin.agreeAnd").trim()}{" "}
                <Text
                  style={styles.agreeLink}
                  onPress={() => router.push("/privacy" as Href)}
                >
                  {t("legalLinks.privacy")}
                </Text>
                {t("signin.agreeEnd")}
              </Text>
            </View>
          </View>
          <Text style={styles.agreeHint}>{t("signin.agreeHint")}</Text>
        </View>

        {Platform.OS === "web" ? (
          <WebGoogleSignInButton
            submitting={submitting}
            setSubmitting={setSubmitting}
            finishSocialLogin={finishSocialLogin}
            failureTitle={t("signin.googleFailed")}
            buttonLabel={t("signin.google")}
            accepted={agreed}
            onBeforePrompt={requireAgreement}
          />
        ) : (
          <TouchableOpacity
            style={[styles.providerButton, !agreed && styles.providerMuted]}
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  bg: {
    width: "100%",
    height: "100%",
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingTop: 60,
    paddingBottom: 72,
    paddingHorizontal: 30,
    overflow: "visible",
    position: "relative",
    zIndex: 1,
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
  providerMuted: {
    opacity: 0.45,
  },
  agreeBlock: {
    width: 328,
    maxWidth: "100%",
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  agreeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  agreeCopy: {
    flex: 1,
    marginLeft: 10,
  },
  agreeBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
  },
  agreeBoxOn: {
    backgroundColor: "#fff",
  },
  agreeTick: {
    color: "#000",
    fontSize: 14,
    lineHeight: 16,
    fontFamily: "Nunito-Bold",
  },
  agreeText: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "left",
    fontFamily: "Nunito-Regular",
  },
  agreeLink: {
    color: "#fff",
    textDecorationLine: "underline",
    fontFamily: "Nunito-Bold",
  },
  agreeHint: {
    marginTop: 8,
    marginLeft: 32,
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "left",
    fontFamily: "Nunito-Regular",
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
    zIndex: 2,
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
