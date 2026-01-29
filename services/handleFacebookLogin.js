export const handleFacebookLogin = async (router) => {
  try {
    const response = await fetch('https://0806-78-83-190-19.ngrok-free.app/authentication/social_login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'facebook',
        id_token: '123',
      }),
    });

    const data = await response.json();
    console.log('✅ Backend login success:', data);

    router.push('/onboarding/name');
  } catch (error) {
    console.error('❌ Login error:', error.message);
  }
};
