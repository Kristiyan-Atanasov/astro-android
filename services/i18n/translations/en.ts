// services/i18n/translations/en.ts
//
// English copy for the entire app. Keep keys in sync with bg.ts.

const en = {
  common: {
    next: 'Next',
    saving: 'Saving...',
    skip: 'Skip',
    cancel: 'Cancel',
    tryAgain: 'Try again',
    continueAnyway: 'Continue anyway',
    save: 'Save',
    ok: 'OK',
    notNow: 'Not now',
    seePlan: 'See plan',
    seePlans: 'See plans',
    enable: 'Enable',
    logOut: 'Log out',
    confirmLogout: 'Are you sure you want to log out?',
    sessionExpiredTitle: 'Session expired',
    sessionExpiredBody:
      'You have been signed out for your security. Please sign in again to continue.',
    networkError: 'We couldn’t reach the server. Please check your connection and try again.',
    somethingWentWrong: 'Something went wrong',
  },

  language: {
    title: 'Language',
    english: 'English',
    bulgarian: 'Bulgarian',
  },

  legalLinks: {
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    subscription: 'Subscription terms',
  },

  welcome: {
    title: 'Welcome to\nAstroinsights',
    subtitle: 'Begin your journey of personal transformation',
    button: 'Get Started',
  },

  signin: {
    title: 'Welcome to\nAstroinsights',
    subtitle: 'Begin your journey of personal transformation',
    google: 'Sign in with Google',
    googleFailed: 'Google Sign-In failed',
    loginFailed: 'Login failed',
    enableBiometricTitle: 'Enable {{label}}?',
    enableBiometricBody: 'Use {{label}} to sign in to Astroinsights faster next time.',
  },

  lock: {
    title: 'Welcome back',
    subtitle: 'Unlock to continue to Astroinsights',
    prompt: 'Unlock Astroinsights',
    unlock: 'Unlock with {{label}}',
    useDifferentAccount: 'Sign in with a different account',
  },

  onboarding: {
    language: {
      title: 'Choose your language',
      description:
        'Pick the language Astroinsights will speak with you. All readings, daily messages and screens will appear in this language.',
      english: 'English',
      bulgarian: 'Български',
      warning:
        'Choose wisely. After you continue, the language can only be changed by contacting our support team.',
      confirmTitle: 'Continue in {{language}}?',
      confirmBody:
        'You will only be able to change the language later by contacting our support team. Continue with {{language}}?',
      confirmContinue: 'Continue',
      confirmCancel: 'Pick again',
    },
    name: {
      title: 'Your Name',
      description: 'Name or nickname you want to use.',
      placeholder: 'Enter your name',
      info: 'We use this to generate your Astroinsights wheel. We never share or sell your data.',
    },
    birthday: {
      title: 'Date of Birth',
      description: 'We calculate your chart, based on your day of birth.',
      info: 'We use this to generate your Astroinsights wheel. We never share or sell your data.',
      monthLabel: 'Month',
      dayLabel: 'Day',
      yearLabel: 'Year',
    },
    time: {
      title: 'Time of birth',
      description:
        'Time is important for determining your houses, rising sign, and exact Moon position.',
      info: 'We use this to generate your Astroinsights wheel. We never share or sell your data.',
      hourLabel: 'Hour',
      minuteLabel: 'Min',
      periodLabel: 'AM/PM',
      dontKnow: 'I don’t know',
    },
    location: {
      title: 'Place of Birth',
      description:
        'Birthplace is important for determining your Ascendant.',
      placeholder: 'Start typing your birth city',
      info: 'We use this to generate your Astroinsights wheel. We never share or sell your data.',
      keepTyping: 'No matching cities yet — keep typing.',
      missingInfoTitle: 'Missing info',
      missingName: 'Please enter your name first.',
      missingBirthDate: 'Please enter your date of birth first.',
      lookupFailedTitle: 'Couldn’t look up your birth location',
      lookupFailedBody:
        'Our location lookup service is having trouble right now.\n\nYou can try again in a moment, or continue and we’ll retry in the background.',
      onboardingFailedTitle: 'Onboarding failed',
    },
    socials: {
      title: 'Add Social Accounts',
      subtitle:
        'If you want to connect with other people using the app, add your social networks.',
      info: 'Adding your social accounts doesn’t make them visible right away. You can choose whether to keep them private or make them public later.',
      facebookPlaceholder: 'facebook.username',
      instagramPlaceholder: 'instagram.username',
    },
    vibe: {
      title: 'Daily Insight',
      loading: '“Loading your daily insight…”',
      continue: 'Continue',
      calculatingTitle: 'Calculating your chart…',
      calculatingSubtitle:
        'We’re asking the stars a few questions. This can take up to a minute the first time.',
    },
    notifications: {
      title: 'Enable notifications',
      subtitle:
        'The app uses notifications as a main tool for self-reflection, so if you want to experience the full potential of Astroinsights, we recommend turning them on.',
      enable: 'Turn on notifications',
    },
  },

  home: {
    helloFallback: 'Hello!',
    hello: 'Hello, {{name}}!',
    dailyVibeTitle: 'Daily Insight',
    dailyVibeLoading: '“Loading your daily insight…”',
    astrowheelTitle: 'Your Astrowheel',
    astrowheelText:
      'This isn’t your natal chart, the astrowheel displays the archetypal energies we all share, while the glowing sectors are unique to you, showing your main areas of growth based on the data you’ve provided. Tap any sign, glowing or not, to explore what aspect of your psyche it represents.',
    chartKeysTitle: 'The 12 Archetypes',
    chartKeysText:
      'The purple signs represent the qualities it’s important you develop and master in this lifetime. The rest are characteristics you already have, but should learn to manage. But since no algorithm is perfect we recommend exploring each archetype yourself to see how much of that energy is present in your life and whether it feels lacking, excessive or balanced.',
    premiumRequiredTitle: 'Premium account required',
    premiumRequiredBody:
      '{{archetype}} details are only available on the premium plan. Upgrade to unlock all archetypes.',
    communityTitle: 'Explore community',
    communityText:
      'Find exclusive content and connect with other people with similar wheels.',
  },

  community: {
    headerTitle: 'People in common',
    bannerTitle: 'Explore people like you',
    bannerText:
      'Find exclusive content and connect with other people with similar wheels.',
    sectionSubtitle:
      'Each person has 12 archetypes in their birth chart, but some are weak and others are well positioned.',
    male: 'Male',
    female: 'Female',
    empty: 'No community members to show yet. Check back soon!',
  },

  menu: {
    title: 'Menu',
    subscription: 'Subscription',
    plan: { free: 'Free', premium: 'Premium' },
    upgrade: 'Upgrade',
    items: {
      home: 'Home',
      myProfile: 'Profile',
      accountSettings: 'Account settings',
      editProfile: 'Edit Profile',
      notifications: 'Notifications',
      community: 'Community',
      subscriptions: 'Subscriptions',
      privacy: 'Privacy policy',
      terms: 'Terms of Service',
      faq: 'FAQ',
      logout: 'Log out',
    },
    statuses: {
      freePlan: 'Free Plan',
      premiumPlan: 'Premium',
    },
  },

  profile: {
    title: 'My profile',
    email: 'Email',
    userId: 'User ID',
    signOut: 'Sign Out',
    deleteAccount: 'Delete Account',
    signOutConfirmTitle: 'Sign out',
    signOutConfirmBody: 'Are you sure you want to sign out?',
    deleteConfirmTitle: 'Delete account',
    deleteConfirmBody:
      'This will permanently delete your account and all associated data. This action cannot be undone.',
    deleteAction: 'Delete',
    deleteFailedTitle: 'Could not delete account',
    deleteFailedBody: 'Please try again later.',
  },

  profilePage: {
    pageTitle: 'Profile',
    birthChart: 'Birth Chart',
    transits: 'Transits',
    natalChartAndTransits: 'Natal Chart and Transits',
    sun: 'Sun',
    moon: 'Moon',
    rising: 'AC',
    chartLoading: 'Loading chart…',
    chartUnavailable:
      'Your chart will appear here once it has been calculated for your birth data.',
    missingBirthData:
      'Complete your birth date, time, and city in registration so we can calculate your chart.',
    transitNow: 'Current sky',
    accountSettings: 'Account settings',
    photoTitle: 'Profile photo',
    photoHint: 'Upload a clear photo of yourself. Nudity and sexual content are not allowed.',
    photoUpload: 'Upload photo',
    photoRemove: 'Remove photo',
    photoCancel: 'Cancel',
    photoPermissionTitle: 'Photo access needed',
    photoPermissionBody:
      'Allow photo library access in Settings so you can set your profile picture.',
    photoRebuildTitle: 'App rebuild needed',
    photoRebuildBody:
      'Photo upload needs a native rebuild. Run npx expo run:android, then try again.',
    photoBlockedTitle: 'Photo not allowed',
    photoBlockedBody:
      'That image looks inappropriate. Please choose a different profile photo — no nudity or sexual content.',
    photoInvalidTitle: 'Invalid photo',
    photoInvalidBody:
      'Please use a normal JPG or PNG photo under 6 MB. GIFs and tiny images aren’t supported.',
    photoCheckFailedTitle: 'Couldn’t verify photo',
    photoCheckFailedBody:
      'We couldn’t run the safety check on that image. Try another photo, or check your connection and try again.',
    photoFailedTitle: 'Upload failed',
    photoFailedBody: 'Something went wrong while uploading. Please try again.',
    chartPositionsTitle: 'Planetary Positions',
    chartPositionsBody: 'Body',
    chartPositionsPosition: 'Sign · House',
    chartPositionsAngles: 'Chart Angles',
    planetSun: 'Sun',
    planetMoon: 'Moon',
    planetMercury: 'Mercury',
    planetVenus: 'Venus',
    planetMars: 'Mars',
    planetJupiter: 'Jupiter',
    planetSaturn: 'Saturn',
    planetUranus: 'Uranus',
    planetNeptune: 'Neptune',
    planetPluto: 'Pluto',
    planetNorthNode: 'North Node',
    planetSouthNode: 'South Node',
    planetAscendant: 'Ascendant',
    planetMidheaven: 'Midheaven',
    planetDescendant: 'Descendant',
    planetImumCoeli: 'Imum Coeli',
  },

  editProfile: {
    title: 'Account settings',
    name: 'Name',
    namePlaceholder: 'Your name',
    birthChart: 'Birth Chart',
    birthday: 'Birthday',
    birthdayPlaceholder: 'Select your birthday',
    birthCity: 'Birth City',
    birthCityPlaceholder: 'Enter your birth city',
    birthHour: 'Birth Hour',
    minute: 'Minute',
    saved: 'Your profile has been updated.',
    updateFailed: 'Update failed',
    done: 'Done',
    lockedHint:
      'Your astrology profile is locked. To request a change, contact support.',
    contactSupport: 'Contact support',
    supportTitle: 'Request a profile change',
    supportInstructions:
      'Tell us what you’d like to change. We’ll review it and get back to you.',
    supportEmailLabel: 'Your email',
    supportEmailPlaceholder: 'you@example.com',
    supportMessageLabel: 'What would you like to change?',
    supportMessagePlaceholder:
      'Describe what should be updated (e.g. correct birth time, fix city)…',
    supportSubmit: 'Send request',
    supportSubmitting: 'Opening mail…',
    supportSuccessTitle: 'Almost done',
    supportSuccessBody:
      'Your mail app is opening with the request prefilled. Hit send to deliver it to our team.',
    supportNoMailTitle: 'No mail app available',
    supportNoMailBody:
      'Please email astro.insights.ltd@gmail.com directly with your request.',
    supportEmailRequired: 'Please enter a valid email address.',
    supportMessageRequired: 'Please describe the change you need.',
    supportSubject: 'Profile change request',
  },

  notificationsSettings: {
    title: 'Notifications',
    notifications: 'Notifications',
    receiveDaily: 'Receive daily notifications',
    timeOfDay: 'Time of the day',
    from: 'From',
    to: 'To',
    perDay: 'How many per day',
    counts: {
      once: 'Once',
      twice: 'Twice',
      nTimes: '{{count}} times',
    },
    saved: 'Your notification preferences have been updated.',
    updateFailed: 'Update failed',
    invalidRange: 'End time must be after start time.',
    done: 'Done',
  },

  subscription: {
    letsGetStarted: 'Let’s get started',
    title: 'How your free trial\nworks',
    plan: 'Monthly Subscription',
    planMonthly: 'Monthly Subscription',
    planYearly: 'Yearly Subscription',
    discount: '38% off',
    bestValue: 'Best value',
    trial: 'with 7 days free trial',
    yearlyBilling: 'Billed once a year',
    perMonth: '/ month',
    perYear: '/ year',
    securedPlayStore: 'Secured with Google Play. Cancel Anytime.',
    cta: 'Start your 7-days free trial, then {{price}} / per month',
    ctaYearly: 'Subscribe for {{price}} / year',
    cancelInfo: 'Cancel anytime during your trial and you won’t be charged.',
    cancelInfoYearly:
      'Cancel anytime. Your yearly subscription renews automatically unless cancelled.',
    restore: 'Restore purchases',
    welcomeTitle: 'Welcome to premium',
    welcomeBody:
      'Your free trial has started. Enjoy your full archetype experience.',
    notActiveTitle: 'Subscription not active yet',
    notActiveBody:
      'We received your purchase but it isn’t active yet. Please try again in a moment.',
    nothingToRestoreTitle: 'Nothing to restore',
    nothingToRestoreBody:
      'We couldn’t find any active subscription on this account.',
    restoredTitle: 'Subscription restored',
    restoredBody: 'Your premium access is active again.',
    noActiveTitle: 'No active subscription',
    noActiveBody: 'We could not find an active subscription on this account.',
    restoreFailedTitle: 'Restore failed',
    restoreFailedBody: 'We couldn’t restore purchases. Please try again.',
    purchaseFailedTitle: 'Purchase failed',
    purchaseFailedBody: 'Something went wrong. Please try again.',
    verificationFailedTitle: 'Verification failed',
    verificationFailedBody:
      'We couldn’t verify your subscription yet. Please try again.',
    notAvailableTitle: 'Not available here',
    notAvailableBody:
      'In-app purchases aren’t available on this device. Try on a real device with the Google Play.',
    notConfiguredTitle: 'Subscription not configured',
    notConfiguredBody:
      'The subscription product ({{sku}}) isn’t available. Make sure it exists in Play Console and is approved for testing.',
    notReadyTitle: 'Store not ready',
    notReadyBody:
      'The store connection wasn’t ready. Please close and reopen the app, then try again.',
    signInRequiredTitle: 'Sign in required',
    signInRequiredBody: 'Please sign in again before subscribing.',
    continue: 'Continue',
    unavailableBanner:
      'Subscriptions are not live in this build yet. Tap to learn how to upgrade.',
    unavailableTitle: 'Subscriptions are not live yet',
    unavailableBody:
      'In-app purchases aren’t enabled in this build. We can help you upgrade manually — email our support team and we’ll get back to you with next steps.',
    unavailableMailFallback:
      'No mail app is available. Please email {{email}} directly to upgrade.',
    contactSupport: 'Contact support',
    supportSubject: 'Premium upgrade request',
    supportBody:
      'Hi Astroinsights team,\n\nI’d like to upgrade to premium ({{plan}} plan).\n\nThanks!',
  },

  legal: {
    terms: {
      title: 'Terms and Conditions',
      sections: [
        {
          heading: '1. Acceptance of Terms',
          body: 'By downloading, installing, creating an account, or using AstroInsights (the "App"), you confirm that you are at least 16 years old, that you have read these Terms and Conditions in full, and that you agree to be bound by them along with our Privacy Policy. If you do not agree with any provision, you must stop using the App immediately and uninstall it from your device.',
        },
        {
          heading: '2. Entertainment-Only Service',
          body: 'AstroInsights provides astrological content, birth-chart calculations, daily horoscopes, archetypes, and similar material for personal entertainment, self-reflection, and informational purposes only. The App is not a science, is not endorsed by any scientific community, and is not, and must not be treated as, a substitute for professional medical, psychological, legal, financial, relationship, or any other form of advice. You agree to consult a qualified, licensed professional for decisions in those areas and to never rely on astrological output as a basis for action that may affect your health, finances, safety, or legal standing.',
        },
        {
          heading: '3. No Guarantees, Predictions or Outcomes',
          body: 'All readings, insights, vibes, archetypes, compatibility scores, and any other output generated by the App are subjective interpretations based on date and place of birth and similar inputs. We make no representation or warranty of any kind, express or implied, regarding accuracy, reliability, completeness, suitability, fitness for a particular purpose, or that any predicted event will occur. You acknowledge that astrological output may differ between systems, practitioners, and software, and that you assume full responsibility for any choice you make in reliance on such output.',
        },
        {
          heading: '4. Eligibility and User Account',
          body: 'You must be at least 16 years old, or the minimum digital-consent age in your jurisdiction, whichever is higher, to create an account. By creating an account you represent that all information you provide (including name, date, time and city of birth, and contact details) is accurate and that you have the right to provide it. You are solely responsible for all activity under your account, including activity by anyone you allow to access it. We may suspend or terminate any account that violates these Terms or that we reasonably believe poses a risk to other users, the service, or us.',
        },
        {
          heading: '5. Subscriptions, Trials and Refunds',
          body: 'Certain features require a paid subscription processed by Google Play. Free trials, where offered, automatically convert to a paid subscription unless cancelled before the trial ends. All payments are handled by Google Play, and you must manage and cancel subscriptions through your Google Play account settings. Except where required by mandatory consumer-protection law, all sales are final and we do not provide refunds for unused periods, partially used periods, or accidental purchases. Pricing, currencies, billing cycles and trial terms may change at any time and will apply to subsequent billing cycles.',
        },
        {
          heading: '6. Intellectual Property',
          body: 'The App and all of its content, including but not limited to text, graphics, designs, logos, audio, code, calculation methods, archetype descriptions, daily insights and other material, are owned by AstroInsights or its licensors and are protected by copyright, trademark and other intellectual-property laws. We grant you a limited, personal, non-exclusive, non-transferable, revocable licence to use the App for your own non-commercial purposes only. You may not copy, modify, distribute, sell, lease, sublicense, reverse-engineer, scrape, or create derivative works from any part of the App.',
        },
        {
          heading: '7. User Conduct',
          body: 'You agree not to use the App in any way that is unlawful, harmful, threatening, abusive, defamatory, obscene, infringing, or otherwise objectionable. You agree not to attempt to gain unauthorised access to any part of the App or its underlying infrastructure, not to interfere with the security or integrity of the App, not to use the App to collect or harvest information about other users, and not to use any automated system or bot to access the App.',
        },
        {
          heading: '8. Disclaimer of Warranties',
          body: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, NON-INFRINGEMENT, OR UNINTERRUPTED OR ERROR-FREE OPERATION. WE DO NOT WARRANT THAT THE APP WILL MEET YOUR REQUIREMENTS, THAT ANY DEFECT WILL BE CORRECTED, OR THAT THE APP IS FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.',
        },
        {
          heading: '9. Limitation of Liability',
          body: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL ASTROINSIGHTS, ITS AFFILIATES, OFFICERS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OPPORTUNITIES, OR EMOTIONAL OR PHYSICAL DISTRESS, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF, OR INABILITY TO USE, THE APP OR ANY OUTPUT FROM IT, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS RELATING TO THE APP WILL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR €50, WHICHEVER IS LOWER.',
        },
        {
          heading: '10. Indemnification',
          body: 'You agree to defend, indemnify and hold harmless AstroInsights and its affiliates, officers, employees and agents from and against any claims, damages, liabilities, losses, costs, and expenses (including reasonable legal fees) arising out of or related to: (a) your use of the App; (b) your violation of these Terms; (c) your violation of any third-party right; or (d) any decision or action you take based on output of the App.',
        },
        {
          heading: '11. Modification of Service and Terms',
          body: 'We may, at any time and at our sole discretion, modify, suspend, or discontinue the App or any feature, with or without notice. We may also update these Terms from time to time. We will indicate the date of the latest revision at the top of this document. Your continued use of the App after changes are posted constitutes your acceptance of the revised Terms.',
        },
        {
          heading: '12. Governing Law and Dispute Resolution',
          body: 'These Terms are governed by the laws of the Republic of Bulgaria, without regard to its conflict-of-law provisions. To the extent permitted by law, you and AstroInsights agree that any dispute arising out of or relating to the App or these Terms will be resolved exclusively by the competent courts located in Sofia, Bulgaria. Nothing in these Terms limits any non-waivable consumer rights you may have under the laws of your country of residence.',
        },
        {
          heading: '13. Severability and Entire Agreement',
          body: 'If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions will continue in full force and effect. These Terms, together with our Privacy Policy and any in-app notices, constitute the entire agreement between you and AstroInsights regarding the App and supersede any prior agreement on the subject.',
        },
        {
          heading: '14. Contact',
          body: 'Questions about these Terms can be sent to support@astroinsights.io. Where required by law, this address also serves as the point of contact for complaints and notices.',
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      sections: [
        {
          heading: '1. Who We Are',
          body: 'AstroInsights ("we", "us", "our") operates the AstroInsights mobile application. This Privacy Policy explains what personal data we collect, how we use it, on what legal basis, with whom we share it, and what rights you have. For purposes of the EU General Data Protection Regulation (GDPR), we act as the controller of your personal data.',
        },
        {
          heading: '2. Data We Collect',
          body: 'We collect: (a) account data such as your name, email address, and the social-account handles you choose to add; (b) astrological inputs such as your date, time, and city of birth, and any other information you enter to receive readings; (c) device and usage data such as device model, operating-system version, language, app version, crash reports and aggregated analytics; (d) authentication identifiers received from Google when you sign in; and (e) subscription and purchase metadata received from Google Play, excluding full payment-card details, which we never see or store.',
        },
        {
          heading: '3. How We Use Your Data',
          body: 'We process your data to: provide the App and its core features (including birth-chart calculation, archetypes, and daily insights); create and secure your account; deliver notifications you have enabled; manage subscriptions and refunds; respond to support requests; comply with legal obligations; and improve the App through analytics and crash reporting. We do not use astrological output to make decisions that have legal or similarly significant effects on you.',
        },
        {
          heading: '4. Legal Basis (GDPR)',
          body: 'We process your personal data based on: (a) performance of a contract with you, in order to provide the App and its features; (b) your consent, where required, for example for non-essential analytics, marketing communications, or push notifications; (c) our legitimate interests in keeping the App secure, preventing abuse, and improving the service, balanced against your rights; and (d) compliance with legal obligations such as tax, accounting, and consumer-protection law.',
        },
        {
          heading: '5. Sensitive Data',
          body: 'Birth date, birth time and birth city, when combined, can be considered sensitive information about you. We treat this data with care, use it only to provide your astrological profile, never sell it, and apply technical and organisational measures to protect it. You are not legally required to provide this information; however, without it, the core features of the App will not be available to you.',
        },
        {
          heading: '6. Sharing Your Data',
          body: 'We share data only with: (a) cloud hosting and infrastructure providers (e.g., Amazon Web Services) acting as our processors; (b) authentication providers (Google) when you choose to sign in with them; (c) Google Play for subscription processing; (d) analytics, crash-reporting, and customer-support tools acting as our processors; and (e) competent authorities when required by law. We do not sell your personal data to anyone.',
        },
        {
          heading: '7. International Transfers',
          body: 'Some of our processors may store data outside the European Economic Area. Where this is the case, we rely on appropriate safeguards such as the European Commission\'s Standard Contractual Clauses or, where applicable, an adequacy decision.',
        },
        {
          heading: '8. Retention',
          body: 'We keep account and astrological data for as long as your account is active. If you delete your account, we will delete or anonymise your personal data within 90 days, except where we are legally required to retain certain records (for example, invoices) for longer periods.',
        },
        {
          heading: '9. Your Rights',
          body: 'Subject to applicable law, you have the right to access, rectify, erase, or port your personal data, to restrict or object to certain processing, and to withdraw consent at any time. You may exercise these rights by emailing privacy@astroinsights.io. You also have the right to lodge a complaint with your local data-protection authority.',
        },
        {
          heading: '10. Children',
          body: 'The App is not directed to children under 16. We do not knowingly collect personal data from children under 16. If you believe a child has provided us personal data, please contact us at privacy@astroinsights.io and we will delete it.',
        },
        {
          heading: '11. Security',
          body: 'We use industry-standard technical and organisational measures, including encryption in transit, secure token storage on your device, and access controls, to protect your personal data. No method of electronic storage or transmission is 100% secure, however, and we cannot guarantee absolute security.',
        },
        {
          heading: '12. Changes to This Policy',
          body: 'We may update this Privacy Policy from time to time. The latest version will always be available in the App. Material changes will be communicated through the App and, where required by law, by email.',
        },
        {
          heading: '13. Contact',
          body: 'For privacy questions or requests, contact us at privacy@astroinsights.io.',
        },
      ],
    },
    faq: {
      title: 'FAQ',
      items: [
        {
          question: 'Is AstroInsights a real prediction service?',
          answer: 'No. AstroInsights is provided strictly for entertainment and self-reflection. Birth charts, daily vibes, archetypes, and any other content are subjective interpretations and are not predictions, professional advice, or guarantees of any future event. Always consult a qualified professional for medical, psychological, legal, financial, or relationship decisions.',
        },
        {
          question: 'How accurate is my birth chart?',
          answer: 'The accuracy of your chart depends entirely on the date, time, and city of birth that you enter. A small error in birth time can shift your rising sign and houses; an unknown time will limit the accuracy of those calculations. You can update your information any time from Edit Profile, and we will recompute your chart on the next sync.',
        },
        {
          question: 'Why do you need my date, time and city of birth?',
          answer: 'Those three inputs are the standard data needed to generate a personal astrological profile (sun sign, moon sign, rising sign, houses, and aspects). We never sell this data. We use it only to provide the features of the App and protect it with appropriate security measures, as described in our Privacy Policy.',
        },
        {
          question: 'How do I cancel my subscription?',
          answer: 'All subscriptions are billed and managed by Google Play, not by AstroInsights. To cancel, open Google Play on your device → your account → Payments & subscriptions → Subscriptions → AstroInsights → Cancel. Cancellation will stop the next renewal; the current paid period will remain active until it ends.',
        },
        {
          question: 'Can I get a refund?',
          answer: 'Refunds for Play Store purchases are issued by Google according to their refund policies. AstroInsights does not have access to your payment method and cannot issue refunds directly. You may also have additional rights under your local consumer-protection law.',
        },
        {
          question: 'How does the free trial work?',
          answer: 'If a free trial is offered, you will not be charged during the trial period. Unless you cancel before the trial ends, the subscription will automatically renew at the price shown when you signed up. You can cancel at any time during the trial through your store account.',
        },
        {
          question: 'Can I change my name, birthday, or birth city after onboarding?',
          answer: 'Yes. Open the side menu → Edit Profile, change the fields you want, and tap Save. Your chart and personalised content will update on the next sync.',
        },
        {
          question: 'How do I delete my account and data?',
          answer: 'From the side menu, tap Log out, then send a deletion request to privacy@astroinsights.io from the email tied to your account. We will delete or anonymise your personal data within 90 days, except where we are legally required to retain certain records.',
        },
        {
          question: 'Will AstroInsights tell me what to do?',
          answer: 'No. The App is not designed to make decisions for you. It offers astrological perspectives that you may find inspiring, useful for journaling, or simply fun. You are always responsible for your own decisions.',
        },
        {
          question: 'I think a reading was wrong or upsetting — what should I do?',
          answer: 'Astrological content is inherently subjective and may not resonate with everyone. If something in the App caused distress, please consult a qualified professional and do not act on it. If you would like us to look into it, email support@astroinsights.io with a description of what you saw.',
        },
        {
          question: 'How can I contact support?',
          answer: 'For general questions, email support@astroinsights.io. For privacy questions, email privacy@astroinsights.io. We aim to reply within five business days.',
        },
      ],
    },
  },

  archetype: {
    rulerLabel: 'RULER',
    elementLabel: 'ELEMENT',
    sectionTitle: 'Unlocking the archetype',
    lessons: '{{count}} lessons',
    pro: 'PRO',
    intro:
      'Use the list below to explore this archetype and work with its unique traits.',
    readMore: 'Read more',
    showLess: 'Show less',
    learningHeader: 'Learning',
    learningDescription:
      'includes qualities you haven’t yet developed. Those are archetypal “languages” that your soul came here to learn.',
    owningHeader: 'Balancing',
    owningDescription:
      'contains affirmations for those who already possess the qualities of the sign, but may want to elevate it and reach their highest potential.',
    growthIntro:
      'We grow in two ways in this lifetime:\n• by refining what we’re naturally gifted at\n• by learning the energies we weren’t born knowing',
    masteringSectionExplain:
      'The "Learning" section helps us learn the language of this sign, especially when the nature of the archetype feels unfamiliar to us, but we sense that it is important to master it. By activating qualities from this list you\'ll receive daily reminders that will keep you on your path.',
    managingSectionExplain:
      'The "Balancing" section, on the other hand, is for cases in which the sign and its way of behaving and thinking are not unfamiliar to us, but we often operate through its lower expressions. This is why we want to be reminded of its higher expressions, in order to embody them.',
    explorePace:
      'You can read the qualities in both categories and select everything you feel you need to be reminded of more often.',
    tabMastering: 'Learning',
    tabManaging: 'Balancing',
    progress: 'Progress',
    progressPercent: '{{percent}}% complete',
    learnedAction: 'Learned',
    unlearnAction: 'Unlearn',
    learnedLabel: 'Learned',
    newLabel: 'New',
    openHint: 'Read',
    legendTitle: 'How it works',
    legendTap:
      'Tap a trait to activate it (purple). Active traits power your daily insights.',
    legendLearned:
      'Swipe right once you’ve learned it — it turns green and moves to the bottom.',
    legendUnlearn:
      'Swipe left on a green learned trait to mark it as not learned yet.',
    legendOpen: 'Tap Read to open and view the full lesson.',
    emptyQualities: 'No qualities to show yet. Check back later.',
    premiumQualityTitle: 'Premium quality',
    premiumQualityBody:
      'This quality is part of the premium plan. Start your free trial to unlock it.',
    qualityUpdateFailed: 'Update failed',
    qualityUpdateFailedBody:
      'We couldn’t update this quality. Please try again.',
  },

  quality: {
    shareTitle: 'Share',
    shareUnavailableTitle: 'Sharing unavailable',
    shareUnavailableBody:
      'We couldn’t open the share menu on this device. Please try again.',
  },

  // Static archetype meta. Backend returns dynamic content already
  // translated based on user's saved language; this is the static
  // ruler/element/intro that we display per-sign on the detail screen.
  archetypeMeta: {
    ARIES: {
      label: 'Aries',
      ruler: 'Mars',
      element: 'Fire',
      description:
        'Ruled by Mars, Aries embodies courage, action and the spark of new beginnings. This archetype teaches you how to trust your instincts, take initiative and embrace challenges. Aries energy pushes you to be bold and direct, to express your desires without fear and move forward even when the path is uncertain. It’s about awakening the warrior within.',
    },
    TAURUS: {
      label: 'Taurus',
      ruler: 'Venus',
      element: 'Earth',
      description:
        'Ruled by Venus, Taurus embodies stability, pleasure and grounded presence. This archetype teaches you how to slow down, enjoy life’s beauty and create lasting security through patience and consistency. Taurus energy reminds you to connect with your body, your senses and the natural world. It’s about building something real, nurturing what you love and learning that true abundance grows from peace, not pressure.',
    },
    GEMINI: {
      label: 'Gemini',
      ruler: 'Mercury',
      element: 'Air',
      description:
        'Ruled by Mercury, Gemini embodies curiosity, communication and mental agility. This archetype teaches you how to explore ideas, ask questions and stay open to multiple perspectives. Gemini energy encourages you to express yourself freely, connect with others and let your mind stay flexible and playful. It’s about learning through conversation, embracing your curiosity and discovering that knowledge grows when you share it.',
    },
    CANCER: {
      label: 'Cancer',
      ruler: 'Moon',
      element: 'Water',
      description:
        'Ruled by the Moon, Cancer embodies emotional depth, intuition and nurturing energy. This archetype teaches you how to connect with your feelings, honor your needs and create meaningful bonds. Cancer energy encourages you to protect what you love, build a sense of home within yourself and trust your inner tides. It’s about embracing vulnerability as strength and allowing your sensitivity to guide you toward connection and healing.',
    },
    LEO: {
      label: 'Leo',
      ruler: 'Sun',
      element: 'Fire',
      description:
        'Ruled by the Sun, Leo embodies radiance, confidence and creative expression. This archetype teaches you how to shine authentically, trust your gifts and lead with warmth. Leo energy encourages you to embrace visibility, celebrate who you are and inspire others simply by being yourself. It’s about stepping into your light with courage and letting your inner fire uplift the world around you.',
    },
    VIRGO: {
      label: 'Virgo',
      ruler: 'Mercury/Earth',
      element: 'Earth',
      description:
        'Ruled by Mercury, Virgo embodies clarity, refinement and practical wisdom. This archetype teaches you how to improve, organize and bring intention into everything you do. Virgo energy encourages you to pay attention to detail, cultivate discipline and seek meaning through service and mastery. It’s about aligning your actions with your purpose and discovering that true growth happens through steady, mindful, daily effort.',
    },
    LIBRA: {
      label: 'Libra',
      ruler: 'Venus',
      element: 'Air',
      description:
        'Ruled by Venus, Libra embodies harmony, connection and the art of balance. This archetype teaches you how to listen, collaborate and see beauty in all perspectives. Libra energy encourages you to create peace, build meaningful relationships and choose fairness over impulse. It’s about finding equilibrium between self and others and learning that true harmony and beauty comes from inner alignment.',
    },
    SCORPIO: {
      label: 'Scorpio',
      ruler: 'Pluto/Mars',
      element: 'Water',
      description:
        'Ruled by Pluto and co-ruled by Mars, Scorpio embodies transformation, depth and emotional power. This archetype teaches you how to face the truth and release what no longer serves you. Scorpio energy invites you into the hidden layers of your psyche where healing, passion and intuition reside. It’s about walking through the dark with courage, trusting your inner radar and emerging stronger each time you shed an old version of yourself.',
    },
    SAGITTARIUS: {
      label: 'Sagittarius',
      ruler: 'Jupiter',
      element: 'Fire',
      description:
        'Ruled by Jupiter, Sagittarius embodies expansion, wisdom and the pursuit of truth. This archetype teaches you how to explore the world with an open heart, seek deeper meaning and trust the journey even when the destination is unclear. Sagittarius energy inspires optimism, courage and a sense of adventure, reminding you that growth comes from stepping beyond the familiar. It’s about following your inner compass and allowing life to broaden your perspective.',
    },
    CAPRICORN: {
      label: 'Capricorn',
      ruler: 'Saturn',
      element: 'Earth',
      description:
        'Ruled by Saturn, Capricorn embodies discipline, ambition and long-term vision. This archetype teaches you how to build steadily, commit to your goals and create foundations that last. Capricorn energy encourages responsibility, resilience and self-mastery, reminding you that true success is a marathon, not a sprint. It’s about honoring your potential, trusting your effort and becoming the architect of your own future.',
    },
    AQUARIUS: {
      label: 'Aquarius',
      ruler: 'Uranus/Saturn',
      element: 'Air',
      description:
        'Ruled by Uranus and Saturn, Aquarius embodies innovation, individuality and visionary thinking. This archetype teaches you how to break patterns, question norms and embrace the uniqueness that sets you apart. Aquarius energy encourages freedom, originality and humanitarian insight, reminding you that progress comes from daring to be different. It’s about seeing beyond the present moment and allowing your ideas to spark global changes that create a better life for everybody.',
    },
    PISCES: {
      label: 'Pisces',
      ruler: 'Neptune/Jupiter',
      element: 'Water',
      description:
        'Ruled by Neptune and Jupiter, Pisces embodies intuition, imagination and emotional sensitivity. This archetype teaches you how to trust the unseen, listen to your inner world and feel life on a deeper level. Pisces energy encourages compassion, creativity and spiritual openness, reminding you that softness is a source of strength, not weakness. It’s about surrendering to the flow of life, embracing empathy as a driving force and allowing your dreams to guide you.',
    },
  },
};

export type Translations = typeof en;
export default en;
