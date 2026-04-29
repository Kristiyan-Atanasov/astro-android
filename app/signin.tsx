import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";

import { API_BASE, setAccessToken, getUserProfile, isOnboardingComplete } from "../services/api";
import {
  getBiometricLabel,
  isBiometricEnabled,
  isBiometricSupported,
  setBiometricEnabled,
} from "../services/biometric";
import { syncDeviceTokenIfChanged } from "../services/notifications";

WebBrowser.maybeCompleteAuthSession(); // required for auth-session redirects [web:334]

const WEB_CLIENT_ID =
  "154762470670-dma1hg357n6n48ishn1b4gjodo33v08r.apps.googleusercontent.com";

const IOS_CLIENT_ID =
  "154762470670-n099k64j893h5qr85lrhh85fiutk533e.apps.googleusercontent.com";

export default function SignInScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const APP_SCHEME = "com.googleusercontent.apps.154762470670-n099k64j893h5qr85lrhh85fiutk533e";

  const redirectUri = makeRedirectUri({
    native: `${APP_SCHEME}:/signin`,
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    redirectUri,
    scopes: ["openid", "profile", "email"],
  });


  const exchangeIdTokenWithBackend = React.useCallback(
    async (idToken: string) => {
      const res = await fetch(`${API_BASE}/authentication/social_login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", id_token: idToken }),
      });

      const raw = await res.text();
      console.log("🌐 social_login status:", res.status);

      let json: any = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        throw new Error(json?.message || json?.detail || `HTTP ${res.status}`);
      }

      const jwt = json?.access || json?.access_token || json?.token || null;
      if (!jwt) throw new Error("Backend returned no JWT.");

      await setAccessToken(jwt);

      syncDeviceTokenIfChanged().catch((e) =>
        console.log("Post-login device token sync failed:", e?.message ?? String(e)),
      );

      const profile = await getUserProfile();
      const next: Href = isOnboardingComplete(profile)
        ? "/home"
        : "/onboarding/name";

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
        console.log("Biometric prompt failed:", (e as any)?.message ?? String(e));
      }

      router.replace(next);
    },
    [router, t]
  );

  React.useEffect(() => {
    if (!response) return;

    if (response.type === "success") {
      const idToken = (response.params as any)?.id_token;

      if (!idToken) {
        Alert.alert(t("signin.googleFailed"), "No id_token returned from Google.");
        return;
      }

      exchangeIdTokenWithBackend(idToken).catch((e: any) => {
        Alert.alert(t("signin.loginFailed"), e?.message ?? String(e));
      });
    }

    if (response.type === "error") {
      Alert.alert(t("signin.googleFailed"), response.error?.message ?? "Unknown error");
    }
  }, [response, exchangeIdTokenWithBackend, t]);

  const onPressGoogle = async () => {
    try {
      if (!request) return;
      await promptAsync({ useProxy: false });
    } catch (e: any) {
      Alert.alert(t("signin.googleFailed"), e?.message ?? String(e));
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

        <TouchableOpacity style={styles.googleButton} onPress={onPressGoogle} disabled={!request}>
          <Text style={styles.googleText}>{t("signin.google")}</Text>
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
  googleButton: {
    width: 328,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  googleText: {
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
