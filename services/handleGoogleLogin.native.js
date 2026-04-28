import { Alert, Platform } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { API_BASE, setAccessToken } from "./api";
import { debugFetchJson } from "./debugFetch";
console.log("✅ LOADED: handleGoogleLogin.native");
const WEB_CLIENT_ID =
  "154762470670-dma1hg357n6n48ishn1b4gjodo33v08r.apps.googleusercontent.com";

const IOS_CLIENT_ID =
  "154762470670-n099k64j893h5qr85lrhh85fiutk533e.apps.googleusercontent.com";

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  iosClientId: Platform.OS === "ios" ? IOS_CLIENT_ID : undefined,
  offlineAccess: false,
  scopes: ["profile", "email", "openid"],
});

export function handleGoogleSignIn(router: any) {
  const login = async () => {
    try {
      console.log("🔍 Google login: starting", { os: Platform.OS });

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }).catch(() => {});
      console.log("🔍 hasPlayServices done");

      // IMPORTANT: destructure idToken directly; some people only get it this way. [web:321]
      const { idToken, user } = await GoogleSignin.signIn();
      console.log("🔍 signIn done", { hasIdToken: !!idToken, email: user?.email });

      if (!idToken) {
        throw new Error("No idToken from native Google Sign-In (common on iOS Simulator).");
      }

      const res = await fetch(`${API_BASE}/authentication/social_login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", id_token: idToken }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Social login failed (${res.status})`);

      const jwt = data?.access || data?.access_token || data?.token || null;
      if (!jwt) throw new Error("Backend returned no JWT.");

      await setAccessToken(jwt);
      router.replace("/onboarding/name");
    } catch (e) {
      console.log("❌ Google login error message:", e?.message);
      console.log("❌ Google login error full:", JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
      console.log("❌ Google login error raw:", e);
      Alert.alert("Google Sign-In failed", e?.message ?? String(e));
    }
  };

  return { login };
}
