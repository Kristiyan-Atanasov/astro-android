import { Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import { API_BASE, setAccessToken } from "./api";
console.log("✅ LOADED: handleGoogleLogin.web");
WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID =
  "154762470670-dma1hg357n6n48ishn1b4gjodo33v08r.apps.googleusercontent.com";

export function handleGoogleSignIn(router) {
  const redirectUri = makeRedirectUri({ path: "signin" });

  // This hook is specifically for getting an ID token. [web:1400]
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: WEB_CLIENT_ID,
    redirectUri,
    scopes: ["openid", "profile", "email"]
  });

  const login = async () => {
    try {
      const result = await promptAsync();
      console.log("🔍 auth-session result", result.type, result.params);
      if (result.type !== "success") return;

      // With id-token flow, this is usually available on params. [web:1400]
      const idToken = result.params?.id_token;
      if (!idToken) throw new Error("No id_token returned on web.");

      const res = await fetch(`${API_BASE}/authentication/social_login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", id_token: idToken })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Social login failed (${res.status})`);

      const jwt = data?.access || data?.access_token || data?.token || null;
      if (!jwt) throw new Error("Backend returned no JWT.");

      await setAccessToken(jwt);
      router.replace("/onboarding/name");
    } catch (e) {
      const msg = e?.message ?? String(e);
      console.log("❌ Google web login error:", msg);
      Alert.alert("Google Sign-In failed", msg);
    }
  };

  return { login, request, response, redirectUri };
}
