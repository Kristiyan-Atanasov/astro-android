/// <reference types="jest" />

import React from "react";
import { Platform, Text, TouchableOpacity } from "react-native";
import renderer, { act } from "react-test-renderer";

const mockConfigure = jest.fn();
const mockHasPlayServices = jest.fn().mockResolvedValue(true);
const mockSignIn = jest.fn().mockResolvedValue({
  type: "success",
  data: { idToken: "google-id-token" },
});
const mockSocialLogin = jest.fn().mockResolvedValue({ access: "jwt" });
const mockReplace = jest.fn();

Object.defineProperty(Platform, "OS", { value: "android" });

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: mockConfigure,
    hasPlayServices: mockHasPlayServices,
    signIn: mockSignIn,
  },
  isErrorWithCode: (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error,
  statusCodes: { IN_PROGRESS: "IN_PROGRESS" },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock("../../services/api", () => ({
  getUserProfile: jest.fn().mockResolvedValue(null),
  isOnboardingComplete: jest.fn().mockReturnValue(false),
  socialLogin: mockSocialLogin,
}));

jest.mock("../../services/biometric", () => ({
  getBiometricLabel: jest.fn().mockResolvedValue("Biometrics"),
  isBiometricEnabled: jest.fn().mockResolvedValue(false),
  isBiometricSupported: jest.fn().mockResolvedValue(false),
  setBiometricEnabled: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../services/notifications", () => ({
  syncDeviceTokenIfChanged: jest.fn().mockResolvedValue({ ok: false }),
}));

// Load the route only after all native modules have been replaced with stable
// test doubles. This mirrors the lazy route load that happens after tapping
// Get Started in the production app.
const SignInScreen = require("../signin")
  .default as typeof import("../signin").default;

describe("SignInScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without requiring an Android AuthSession client ID", async () => {
    let component: renderer.ReactTestRenderer;

    await act(async () => {
      component = renderer.create(<SignInScreen />);
    });

    const labels = component!.root
      .findAllByType(Text)
      .map((node) => node.props.children);
    expect(labels).toContain("signin.google");
  });

  it("passes the native Google ID token to the backend", async () => {
    let component: renderer.ReactTestRenderer;

    await act(async () => {
      component = renderer.create(<SignInScreen />);
    });

    const googleButton = component!.root
      .findAllByType(TouchableOpacity)
      .find((button) =>
        button
          .findAllByType(Text)
          .some((node) => node.props.children === "signin.google")
      );

    expect(googleButton).toBeDefined();
    await act(async () => {
      await googleButton!.props.onPress();
    });

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockHasPlayServices).toHaveBeenCalledWith({
      showPlayServicesUpdateDialog: true,
    });
    expect(mockSocialLogin).toHaveBeenCalledWith("google", "google-id-token");
    expect(mockReplace).toHaveBeenCalledWith("/onboarding/language");
  });
});
