import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  Dimensions,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native';
import { Alert } from '../components/AppAlert';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getUserProfile,
  getDailyVibe,
  clearAccessToken,
  getCachedAccessToken,
  getUserArchetypes,
  getUserQualities,
  postOnboarding,
} from '../services/api';
import { clearOnboardingDraft, getOnboardingDraft } from '../services/onboardingDraft';
import { setBiometricEnabled } from '../services/biometric';
import {
  clearRegisteredToken,
  subscribeToNotificationTaps,
  syncDeviceTokenIfChanged,
} from '../services/notifications';
import {
  isUserPremiumFromProfile,
  isUserPremiumFromQualities,
} from '../services/iap';
import { rememberScroll, takeScrollRestore } from '../services/scrollRestore';
import Astrowheel, { ZODIAC_SIGNS, type ZodiacSign } from '../components/Astrowheel';
import ZodiacGlyph from '../components/ZodiacGlyph';
import {
  backendCodeToLocale,
  getAppLanguageCode,
  setAppLocale,
} from '../services/i18n';

const KEYS_GRID_ORDER = [
  'ARIES', 'TAURUS', 'GEMINI',
  'LEO', 'VIRGO', 'LIBRA',
  'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS',
  'CANCER', 'SCORPIO', 'PISCES',
] as const;

const ZODIAC_BY_CODE: Record<string, ZodiacSign> = ZODIAC_SIGNS.reduce(
  (acc, sign) => {
    acc[sign.code] = sign;
    return acc;
  },
  {} as Record<string, ZodiacSign>,
);

const KEYS_GRID_SIGNS: ZodiacSign[] = KEYS_GRID_ORDER
  .map((code) => ZODIAC_BY_CODE[code])
  .filter((s): s is ZodiacSign => !!s);

const GRID_GLYPH_SIZE = 52;

const homeBg = require('../assets/images/home-bg-horizon.jpg');
// const homeBg = require('../assets/images/home-bg-test.jpg'); // previous test
// const homeBg = require('../assets/images/home-bg.png'); // original
const vibeIcon = require('../assets/images/vibe-icon.png');
const menuIcon = require('../assets/images/burger.png');
const subBg = require('../assets/images/sub-background.png');
const communityBg = require('../assets/images/community-space.jpg');

// Icons
const icons = {
  home: require('../assets/icons/home.png'),
  profile: require('../assets/icons/profile.png'),
  edit: require('../assets/icons/edit.png'),
  notifications: require('../assets/icons/notification.png'),
  community: require('../assets/icons/community.png'),
  subscriptions: require('../assets/icons/crown.png'),
  privacy: require('../assets/icons/privacy.png'),
  terms: require('../assets/icons/terms.png'),
  faq: require('../assets/icons/faq.png'),
  logout: require('../assets/icons/logout.png'),
};

export default function HomeScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [isPremium, setIsPremium] = useState(false);
  const [dailyVibe, setDailyVibe] = useState<string>('');
  const [activeArchetypes, setActiveArchetypes] = useState<Set<string>>(new Set());
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const pendingRestoreY = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      const y = takeScrollRestore('home');
      if (y == null) return undefined;

      pendingRestoreY.current = y;
      scrollRef.current?.scrollTo({ y, animated: false });
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y, animated: false });
        pendingRestoreY.current = null;
      });

      return undefined;
    }, []),
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const profile = await getUserProfile();
        if (cancelled) return;
        if (!profile) {
          if (!getCachedAccessToken()) {
            router.replace('/');
          }
          return;
        }
        const name = (profile as any)?.name;
        if (typeof name === 'string' && name.trim().length > 0) {
          setUserName(name.trim().split(/\s+/)[0]);
        }

        let premium = isUserPremiumFromProfile(profile);
        if (!premium) {
          try {
            const qualities = await getUserQualities();
            const fromQualities = isUserPremiumFromQualities(qualities);
            if (fromQualities === true) premium = true;
          } catch (qualErr) {
            console.log(
              'Premium qualities check failed:',
              (qualErr as any)?.message ?? String(qualErr),
            );
          }
        }
        if (!cancelled) setIsPremium(premium);
        // If the backend has a language we haven't applied yet locally,
        // adopt it so the rest of the app re-renders in the right language.
        const langCode = (profile as any)?.user_settings?.language;
        if (langCode === 'ENGLISH' || langCode === 'BULGARIAN') {
          const targetLocale = backendCodeToLocale(langCode);
          if (i18n.language !== targetLocale) {
            try {
              await setAppLocale(targetLocale);
            } catch (langErr) {
              console.log(
                'Apply backend language failed:',
                (langErr as any)?.message ?? String(langErr),
              );
            }
          }
        }
      } catch (e) {
        console.log('Profile load failed:', (e as any)?.message ?? String(e));
      }
    })();

    (async () => {
      try {
        const vibe = await getDailyVibe();
        if (cancelled || !vibe) return;
        const text = (vibe as any)?.text;
        if (typeof text === 'string' && text.trim().length > 0) {
          setDailyVibe(text.trim());
        }
      } catch (e) {
        console.log('Vibe load failed:', (e as any)?.message ?? String(e));
      }
    })();

    (async () => {
      try {
        const archetypes = await getUserArchetypes();
        if (cancelled || !archetypes) return;
        const list = (archetypes as any)?.archetypes;
        if (Array.isArray(list)) {
          const codes = list
            .map((a: any) =>
              typeof a?.archetype === 'string' ? a.archetype.toUpperCase() : null,
            )
            .filter((c: any): c is string => !!c);
          setActiveArchetypes(new Set(codes));
        }
      } catch (e) {
        console.log('Archetypes load failed:', (e as any)?.message ?? String(e));
      }
    })();

    syncDeviceTokenIfChanged().catch((e) =>
      console.log('Device token sync failed:', e?.message ?? String(e)),
    );

    (async () => {
      try {
        const draft = await getOnboardingDraft();
        if (!draft || !draft.name || !draft.birth_date) return;
        const birthHour = typeof draft.birth_hour === 'number' ? draft.birth_hour : 12;
        const birthMinute = typeof draft.birth_minute === 'number' ? draft.birth_minute : 0;
        const payload: Record<string, any> = {
          name: String(draft.name),
          birth_date: String(draft.birth_date),
          birth_hour: birthHour,
          birth_minute: birthMinute,
          birth_city: draft.birth_city ? String(draft.birth_city) : 'Unknown',
          social_acc_instagram: draft.social_acc_instagram
            ? String(draft.social_acc_instagram)
            : '',
          social_acc_facebook: draft.social_acc_facebook
            ? String(draft.social_acc_facebook)
            : '',
          user_settings: {
            // Default off — the user makes an explicit choice on the
            // /onboarding/notifications screen.
            allow_notifications: false,
            reminder_count: 1,
            reminder_time_start: '09:00:00',
            reminder_time_end: '21:00:00',
            ...(draft.user_settings ?? {}),
            // Always trust the active app language for the retry, even
            // if a stale draft has a different one.
            language: getAppLanguageCode(),
          },
        };

        const lat =
          typeof draft.birth_city_latitude === 'number'
            ? draft.birth_city_latitude
            : null;
        const lng =
          typeof draft.birth_city_longitude === 'number'
            ? draft.birth_city_longitude
            : null;
        if (lat !== null && lng !== null) {
          payload.birth_city_latitude = lat;
          payload.birth_city_longitude = lng;
          payload.birth_latitude = lat;
          payload.birth_longitude = lng;
          payload.latitude = lat;
          payload.longitude = lng;
        }
        if (draft.birth_city_country) {
          payload.birth_city_country = String(draft.birth_city_country);
          payload.birth_country = String(draft.birth_city_country);
        }
        if (draft.birth_city_country_code) {
          payload.birth_city_country_code = String(draft.birth_city_country_code);
        }
        console.log('🔁 retrying pending onboarding submit');
        await postOnboarding(payload);
        await clearOnboardingDraft();
        console.log('✅ pending onboarding submitted');
      } catch (e) {
        console.log('⚠️ onboarding retry failed:', (e as any)?.message ?? String(e));
      }
    })();

    const unsubscribe = subscribeToNotificationTaps((route: string) => {
      try {
        router.push(route as any);
      } catch (e) {
        console.log('Notif route push failed:', (e as any)?.message ?? String(e));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);

  // Tapping an active archetype on the wheel or in the symbol grid opens
  // the archetype detail screen at app/archetype/[name].tsx. The screen
  // accepts the sign code case-insensitively; lowercase keeps the URL
  // tidy.
  const goToArchetype = (sign: ZodiacSign) => {
    rememberScroll('home', scrollYRef.current);
    router.push(`/archetype/${sign.code.toLowerCase()}` as any);
  };

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  const performLogout = async () => {
    try {
      await clearAccessToken();
      await clearOnboardingDraft();
      await setBiometricEnabled(false);
      await clearRegisteredToken();
    } catch (e) {
      console.log('Logout cleanup failed:', (e as any)?.message ?? String(e));
    } finally {
      closeMenu();
      router.replace('/');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('common.logOut'),
      t('common.confirmLogout'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.logOut'), style: 'destructive', onPress: performLogout },
      ],
      { cancelable: true }
    );
  };

  const todayLabel = React.useMemo(() => {
    const locale = i18n.language === 'bg' ? 'bg-BG' : undefined;
    const now = new Date();
    const weekday = now
      .toLocaleDateString(locale, { weekday: 'short' })
      .toUpperCase();
    const day = now.getDate();
    const month = now
      .toLocaleDateString(locale, { month: 'long' })
      .toUpperCase();
    return `${weekday}, ${day} ${month}`;
  }, [i18n.language]);

  return (
    <View style={styles.container}>
      <Image source={homeBg} style={styles.bg} resizeMode="cover" />

      <ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
        onContentSizeChange={() => {
          const y = pendingRestoreY.current;
          if (y != null) {
            scrollRef.current?.scrollTo({ y, animated: false });
          }
        }}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 60 + insets.bottom + 24 },
        ]}
      >
        {/* Top Section */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.date}>{todayLabel}</Text>
            <Text style={styles.greeting}>
              {userName ? t('home.hello', { name: userName }) : t('home.helloFallback')}
            </Text>
          </View>
          <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
            <Image source={menuIcon} style={styles.menuIcon} />
          </TouchableOpacity>
        </View>

        {/* Daily Vibe */}
        <View style={styles.vibeCard}>
          <View style={styles.vibeHeader}>
            <Image source={vibeIcon} style={styles.vibeIcon} />
            <Text style={styles.vibeTitle}>{t('home.dailyVibeTitle')}</Text>
          </View>
          <Text style={styles.vibeQuote}>
            {dailyVibe ? `“${dailyVibe}”` : t('home.dailyVibeLoading')}
          </Text>
        </View>

        {/* Astrowheel */}
        <Text style={styles.sectionTitle}>{t('home.astrowheelTitle')}</Text>
        <Text style={styles.sectionSub}>{t('home.astrowheelText')}</Text>
        <View style={styles.wheelWrap}>
          <Astrowheel
            size={width - 2}
            activeSet={activeArchetypes}
            onPressSign={goToArchetype}
          />
        </View>

        {/* Zodiac Grid */}
        <Text style={styles.sectionTitle}>{t('home.chartKeysTitle')}</Text>
        <Text style={styles.sectionSub}>{t('home.chartKeysText')}</Text>
        <View style={styles.symbolGrid}>
          {KEYS_GRID_SIGNS.map((sign) => {
            const active = activeArchetypes.has(sign.code);
            const tileSize = (width - 76) / 3;
            if (active) {
              return (
                <TouchableOpacity
                  key={sign.code}
                  style={[
                    styles.symbolBoxActiveWrap,
                    { width: tileSize, height: tileSize },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => goToArchetype(sign)}
                >
                  <LinearGradient
                    colors={['#577CFB', '#B283ED']}
                    locations={[0, 0.9451]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.symbolBoxActive}
                  >
                    <ZodiacGlyph
                      code={sign.code}
                      size={GRID_GLYPH_SIZE}
                      color="#D3D5FB"
                    />
                  </LinearGradient>
                </TouchableOpacity>
              );
            }
            // Inactive tiles are still tappable so the user can learn
            // about any sign, not just their suggested archetypes.
            return (
              <TouchableOpacity
                key={sign.code}
                style={[styles.symbolBox, { width: tileSize, height: tileSize }]}
                activeOpacity={0.7}
                onPress={() => goToArchetype(sign)}
              >
                <ZodiacGlyph
                  code={sign.code}
                  size={GRID_GLYPH_SIZE}
                  color="#D3D5FB"
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Community Banner */}
        <TouchableOpacity
          style={styles.communityCard}
          activeOpacity={0.9}
          onPress={() => router.push('/community')}
        >
          <ImageBackground
            source={communityBg}
            style={styles.communityBg}
            imageStyle={styles.communityBgImage}
          >
            <View style={styles.communityOverlay} />
            <View style={styles.communityContent}>
              <Text style={styles.communityTitle}>{t('home.communityTitle')}</Text>
              <Text style={styles.communityText}>{t('home.communityText')}</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/terms')}
          >
            <Text style={styles.link}>{t('legalLinks.terms')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/privacy')}
          >
            <Text style={styles.link}>{t('legalLinks.privacy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/subscription')}
          >
            <Text style={styles.link}>{t('legalLinks.subscription')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Menu Drawer */}
      {menuVisible && (
        <>
          <Pressable style={styles.menuOverlay} onPress={closeMenu} />
          <Animated.View style={[styles.menuDrawer, { transform: [{ translateX: slideAnim }] }]}>
            <ScrollView
              contentContainerStyle={[
                styles.menuContent,
                { paddingBottom: insets.bottom + 24 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>{t('menu.title')}</Text>
                <TouchableOpacity
                  onPress={closeMenu}
                  style={styles.menuCloseButton}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Subscription Banner */}
              <TouchableOpacity
                onPress={() => {
                  closeMenu();
                  router.push('/subscription');
                }}
                style={styles.subscriptionCard}
                activeOpacity={0.9}
              >
                <ImageBackground
                  source={subBg}
                  style={styles.subscriptionBg}
                  imageStyle={styles.subscriptionBgImage}
                >
                  <View style={styles.subscriptionOverlay} />
                  <View style={styles.subscriptionContent}>
                    <View>
                      <Text style={styles.subscriptionLabel}>{t('menu.subscription')}</Text>
                      <Text style={styles.subscriptionPlan}>
                        {isPremium ? t('menu.plan.premium') : t('menu.plan.free')}
                      </Text>
                    </View>
                    {!isPremium ? (
                      <LinearGradient
                        colors={['rgba(87, 124, 251, 1)', 'rgba(178, 131, 237, 1)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.upgradeButton}
                      >
                        <Ionicons name="diamond-outline" size={14} color="#fff" />
                        <Text style={styles.upgradeText}>{t('menu.upgrade')}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.premiumBadge}>
                        <Ionicons name="diamond" size={14} color="#fff" />
                        <Text style={styles.upgradeText}>{t('menu.plan.premium')}</Text>
                      </View>
                    )}
                  </View>
                </ImageBackground>
              </TouchableOpacity>

              {/* Menu Items */}
              {[
                { label: t('menu.items.home'), icon: icons.home, route: '/home' as const, replace: true },
                { label: t('menu.items.myProfile'), icon: icons.profile, route: '/profile' as const },
                { label: t('menu.items.notifications'), icon: icons.notifications, route: '/notifications' as const },
                { label: t('menu.items.community'), icon: icons.community, route: '/community' as const },
                {
                  label: t('menu.items.subscriptions'),
                  icon: icons.subscriptions,
                  route: '/subscription' as const,
                  status: isPremium
                    ? t('menu.statuses.premiumPlan')
                    : t('menu.statuses.freePlan'),
                },
                { label: t('menu.items.accountSettings'), icon: icons.edit, route: '/edit-profile' as const },
                { label: t('menu.items.privacy'), icon: icons.privacy, route: '/privacy' as const },
                { label: t('menu.items.terms'), icon: icons.terms, route: '/terms' as const },
                { label: t('menu.items.faq'), icon: icons.faq, route: '/faq' as const },
              ].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if ((item as any).action === 'logout') {
                      handleLogout();
                      return;
                    }
                    if ((item as any).route) {
                      closeMenu();
                      if ((item as any).replace) {
                        router.replace((item as any).route);
                      } else {
                        router.push((item as any).route);
                      }
                    }
                  }}
                >
                  <Image source={item.icon} style={styles.menuItemIcon} />
                  <Text style={styles.menuItemText}>{item.label}</Text>
                  {(item as any).status ? (
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{(item as any).status}</Text>
                    </View>
                  ) : null}
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="rgba(255,255,255,0.5)"
                    style={styles.chevronIcon}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </>
      )}

    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: {
    position: 'absolute',
    width,
    height: '100%',
    top: 0,
    left: 0,
    zIndex: -1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  topRow: {
    marginTop: 50,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuButton: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  date: {
    fontSize: 12,
    color: '#ccc',
    fontFamily: 'SFProDisplay-Regular',
  },
  greeting: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
  },
  vibeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    padding: 16,
    marginBottom: 30,
  },
  vibeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vibeIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  vibeTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'CooperLtBT-Bold',
  },
  vibeQuote: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'SFProDisplay-Regular',
  },
  sectionTitle: {
    fontSize: 22,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
    marginBottom: 10,
    lineHeight: 28,
  },
  sectionSub: {
    fontSize: 14,
    color: '#9C9CA6',
    fontFamily: 'SFProDisplay-Regular',
    lineHeight: 20,
    marginBottom: 24,
  },
  wheelWrap: {
    alignSelf: 'center',
    // Pull outside the scroll's horizontal padding so the wheel can sit
    // close to the screen edges and feel as large as in the design.
    marginHorizontal: -23,
    // The wheel SVG's viewBox is taller than the visible wheel art, leaving
    // 51 of its 456 units empty above and below the circle — roughly 53dp
    // once rendered. These margins claw back most of that padding so the
    // section reads as one block, and stay under it so the art is never
    // cropped and the surrounding text is never overlapped.
    marginTop: -48,
    marginBottom: -24,
  },
  symbolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  symbolBox: {
    backgroundColor: '#1A1818',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: '#AA9AC0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  symbolBoxActiveWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#7B80F4',
  },
  symbolBoxActive: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityCard: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    marginTop: 4,
    marginBottom: 24,
  },
  communityBg: {
    width: '100%',
    minHeight: 132,
    justifyContent: 'center',
  },
  communityBgImage: {
    borderRadius: 16,
    resizeMode: 'cover',
  },
  communityOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(8, 10, 26, 0.28)',
  },
  communityContent: {
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  communityTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'CooperLtBT-Bold',
    marginBottom: 8,
  },
  communityText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'SFProDisplay-Regular',
    maxWidth: '92%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 12,
  },
  linkHit: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  link: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'SFProDisplay-Regular',
  },

  // Drawer styles
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 5,
  },
  menuDrawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height: '100%',
    backgroundColor: '#141519',
    paddingHorizontal: 24,
    paddingTop: 32,
    zIndex: 6,
  },
  menuContent: {
    paddingBottom: 24,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  menuTitle: {
    fontSize: 22,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
  },
  menuCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(57, 60, 71, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  subscriptionBg: {
    width: '100%',
    height: 96,
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 16,
  },
  subscriptionBgImage: {
    borderRadius: 16,
  },
  subscriptionOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(8, 10, 18, 0.28)',
    borderRadius: 16,
  },
  subscriptionContent: {
    flex: 1,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  subscriptionLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 2,
  },
  subscriptionPlan: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'CooperLtBT-Bold',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(87, 124, 251, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(178, 131, 237, 0.55)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  menuItemIcon: {
    width: 26,
    height: 26,
    marginRight: 16,
    resizeMode: 'contain',
  },
  menuItemText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SFProDisplay-Regular',
  },
  statusPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 10,
  },
  statusPillText: {
    color: '#ddd',
    fontSize: 12,
    fontFamily: 'SFProDisplay-Regular',
  },
  chevronIcon: {
    marginLeft: 0,
  },
});
