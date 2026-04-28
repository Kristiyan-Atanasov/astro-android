// services/onboardingDraft.js
import * as SecureStore from "expo-secure-store";

const KEY = "onboardingDraft";

export async function getOnboardingDraft() {
  const raw = await SecureStore.getItemAsync(KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function mergeOnboardingDraft(patch) {
  const current = await getOnboardingDraft();
  const next = { ...current, ...(patch ?? {}) };
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  return next;
}

export async function clearOnboardingDraft() {
  await SecureStore.deleteItemAsync(KEY);
}
