import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from "react-native";
import { useRouter, type Href } from "expo-router";
import data from "../assets/data/insights.json";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";

import { API_BASE, setAccessToken, getUserProfile, isOnboardingComplete } from "../services/api";

WebBrowser.maybeCompleteAuthSession(); // required for auth-session redirects [web:334]

type WelcomeLink = {
  label: string;
  route: Href;
};

const WEB_CLIENT_ID =
  "154762470670-dma1hg357n6n48ishn1b4gjodo33v08r.apps.googleusercontent.com";

const IOS_CLIENT_ID =
  "154762470670-n099k64j893h5qr85lrhh85fiutk533e.apps.googleusercontent.com";

export default function SignInScreen() {
  const router = useRouter();
  const links = (data.welcome.links as unknown as WelcomeLink[]) ?? [];

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
      console.log("🌐 social_login raw:", raw);

      let json: any = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        throw new Error(json?.message || json?.detail || raw || `HTTP ${res.status}`);
      }

      const jwt = json?.access || json?.access_token || json?.token || null;
      if (!jwt) throw new Error("Backend returned no JWT.");

      await setAccessToken(jwt);

      const profile = await getUserProfile();
      if (isOnboardingComplete(profile)) {
        router.replace("/home");
      } else {
        router.replace("/onboarding/name");
      }
    },
    [router]
  );

  React.useEffect(() => {
    if (!response) return;

    if (response.type === "success") {
      const idToken = (response.params as any)?.id_token;
      console.log("✅ auth-session success, has id_token:", !!idToken);

      if (!idToken) {
        Alert.alert("Google Sign-In failed", "No id_token returned from Google.");
        return;
      }

      exchangeIdTokenWithBackend(idToken).catch((e: any) => {
        Alert.alert("Login failed", e?.message ?? String(e));
      });
    }

    if (response.type === "error") {
      Alert.alert("Google Sign-In failed", response.error?.message ?? "Unknown error");
    }
  }, [response, exchangeIdTokenWithBackend]);

  const onPressGoogle = async () => {
    try {
      if (!request) return;
      const result = await promptAsync({ useProxy: false });
      console.log("🔍 promptAsync result:", result.type, result.params);
    } catch (e: any) {
      Alert.alert("Google Sign-In failed", e?.message ?? String(e));
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

        <Text style={styles.title}>
          Welcome to{"\n"}AstroInsights
        </Text>
        <Text style={styles.subtitle}>Begin your journey of personal transformation</Text>

        <TouchableOpacity style={styles.googleButton} onPress={onPressGoogle} disabled={!request}>
          <Text style={styles.googleText}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={() => router.push(links[0]?.route)}>
          <Text style={styles.link}>{links[0]?.label}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push(links[1]?.route)}>
          <Text style={styles.link}>{links[1]?.label}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push(links[2]?.route)}>
          <Text style={styles.link}>{links[2]?.label}</Text>
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
