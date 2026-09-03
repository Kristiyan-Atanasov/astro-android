module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    // Optional NSFW moderation for profile photo uploads.
    // Default block threshold is 0.85 (only high-confidence NSFW).
    deepAiApiKey: process.env.EXPO_PUBLIC_DEEPAI_API_KEY || '',
    huggingFaceToken: process.env.EXPO_PUBLIC_HF_TOKEN || '',
    nsfwScoreLimit: Number(process.env.EXPO_PUBLIC_NSFW_SCORE_LIMIT) || 0.85,
  },
});
