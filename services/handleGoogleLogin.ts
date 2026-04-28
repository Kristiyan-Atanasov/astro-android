import { Platform } from "react-native";

console.log("✅ LOADED: handleGoogleLogin (switch)");

const useAuthSession = Platform.OS === "web" || (Platform.OS === "ios" && __DEV__);
// For dev/simulator: use browser-based auth-session to get id_token. [web:334]

console.log("✅ SWITCH", { os: Platform.OS, useAuthSession });

export const handleGoogleSignIn =
  useAuthSession
    ? (require("./handleGoogleLogin.web").handleGoogleSignIn as any)
    : (require("./handleGoogleLogin.native").handleGoogleSignIn as any);
