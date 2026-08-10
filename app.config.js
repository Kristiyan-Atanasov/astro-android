module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    // Optional — stronger NSFW blocking for profile photo uploads.
    deepAiApiKey: process.env.EXPO_PUBLIC_DEEPAI_API_KEY || '',
    huggingFaceToken: process.env.EXPO_PUBLIC_HF_TOKEN || '',
  },
});
