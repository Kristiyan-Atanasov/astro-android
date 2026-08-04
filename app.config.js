const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      // Optional — stronger NSFW blocking for profile photo uploads.
      deepAiApiKey: process.env.EXPO_PUBLIC_DEEPAI_API_KEY || '',
      huggingFaceToken: process.env.EXPO_PUBLIC_HF_TOKEN || '',
    },
  },
};
