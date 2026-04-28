import * as SecureStore from "expo-secure-store";

const API_BASE = "https://yrfz6x9dl1.execute-api.eu-central-1.amazonaws.com/dev";
const ACCESS_TOKEN_KEY = "accessToken";

async function getAccessToken() {
  return (await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)) || null;
}

export const submitOnboarding = async (formData) => {
  const token = await getAccessToken();
  if (!token) throw new Error("Missing access token. Please sign in again.");

  const response = await fetch(`${API_BASE}/authentication/on_boarding/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // this is what you were missing [web:364]
    },
    body: JSON.stringify(formData ?? {}),
  });

  const raw = await response.text(); // read body once, always log it [web:367]
  console.log("🌐 on_boarding status:", response.status);
  console.log("🌐 on_boarding raw:", raw);

  let json = null;
  try { json = raw ? JSON.parse(raw) : null; } catch {}

  if (!response.ok) {
    throw new Error(json?.message || json?.detail || raw || "Onboarding submit failed");
  }

  return json;
};
