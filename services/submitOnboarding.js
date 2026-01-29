export const submitOnboarding = async (formData) => {
  try {
    const response = await fetch('https://0806-78-83-190-19.ngrok-free.app/authentication/on_boarding/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Submission failed:', error);
      throw new Error('Submission failed');
    }

    const result = await response.json();
    console.log('Onboarding success:', result);
    return result;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
};
