// services/api.js
const BASE_URL = 'https://0806-78-83-190-19.ngrok-free.app';

export const sendSocialLoginToken = async (provider, token) => {
  try {
    const res = await fetch(`${BASE_URL}/authentication/social_login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        id_token: token,
      }),
    });

    if (res.ok) {
      const json = await res.json().catch(() => ({})); // in case body is empty
      return { success: true, data: json };
    } else {
      return { success: false, error: await res.text() };
    }
  } catch (err) {
    console.error('Login API error:', err);
    return { success: false, error: err.message };
  }
};
