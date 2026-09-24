// app/archetype/[name].tsx
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Alert } from '../../components/AppAlert';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ZODIAC_SIGNS } from '../../components/Astrowheel';
import ZodiacGlyph from '../../components/ZodiacGlyph';
import {
  ELEMENT_BACKGROUNDS,
  getArchetypeMeta,
  pickAquariusReadingBackground,
  pickAriesReadingBackground,
  pickCancerReadingBackground,
  pickCapricornReadingBackground,
  pickGeminiReadingBackground,
  pickLeoReadingBackground,
  pickLibraReadingBackground,
  pickPiscesReadingBackground,
  pickSagittariusReadingBackground,
  pickScorpioReadingBackground,
  pickTaurusReadingBackground,
  pickVirgoReadingBackground,
  type ZodiacElement,
} from '../../components/archetypeMeta';
import { Swipeable } from 'react-native-gesture-handler';
import {
  getArchetypeQualities,
  getUserQualities,
  getArchetypeCompletedPercentage,
  setQualityActivation,
  setQualityCompletion,
  getUserProfile,
} from '../../services/api';
import {
  isUserPremiumFromProfile,
  isUserPremiumFromQualities,
} from '../../services/iap';
import { rememberScroll, takeScrollRestore } from '../../services/scrollRestore';

type QualityStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

interface QualityItem {
  id: number;
  archetype: string;
  quality_learning_type: string;
  title: string;
  text: string | null;
  status: QualityStatus;
  is_completed: boolean;
  is_free_tier: boolean;
  activated_at?: string | null;
  unlocked_at?: string | null;
  is_recently_unlocked?: boolean;
  can_activate: boolean;
  can_deactivate: boolean;
  lock_reason?: string | null;
}

const TAB_TYPES = {
  mastering: 'LEARNING',
  managing: 'OWNING',
} as const;

type TabKey = keyof typeof TAB_TYPES;

const ELEMENT_COLORS: Record<ZodiacElement, string[]> = {
  fire: ['#FF8A4A', '#F95B3A'],
  earth: ['#7BB07A', '#4A8A57'],
  air: ['#A0C8FF', '#6FA9FF'],
  water: ['#5DC4F2', '#3A7BC8'],
};

// Planet symbol image for each ruling planet, keyed by the canonical English
// ruler name in archetypeMeta. Used so the ruler shows its own planet symbol
// instead of a single hard-coded Sun for every sign. (Rendered as a tinted
// image rather than a Unicode glyph so the symbols look identical on every
// device/font.)
const PLANET_ICONS: Record<string, any> = {
  Sun: require('../../assets/images/planets/sun.png'),
  Moon: require('../../assets/images/planets/moon.png'),
  Mercury: require('../../assets/images/planets/mercury.png'),
  Venus: require('../../assets/images/planets/venus.png'),
  Mars: require('../../assets/images/planets/mars.png'),
  Jupiter: require('../../assets/images/planets/jupiter.png'),
  Saturn: require('../../assets/images/planets/saturn.png'),
  Uranus: require('../../assets/images/planets/uranus.png'),
  Neptune: require('../../assets/images/planets/neptune.png'),
  Pluto: require('../../assets/images/planets/pluto.png'),
};

function findSign(code: string) {
  const upper = (code || '').toUpperCase();
  return ZODIAC_SIGNS.find((s) => s.code === upper) ?? null;
}

function titleCase(s: string) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Normalize API rows so id/archetype types are consistent for Map lookups and POST bodies.
function normalizeQualityRow(raw: any): QualityItem | null {
  if (!raw || raw.id == null) return null;
  const id = typeof raw.id === 'number' ? raw.id : Number(raw.id);
  if (!Number.isFinite(id)) return null;
  return {
    ...raw,
    id,
    archetype: String(raw.archetype || '').toUpperCase(),
    status: (raw.status || 'INACTIVE') as QualityStatus,
    is_completed: !!raw.is_completed,
    is_free_tier: !!raw.is_free_tier,
    can_activate: !!raw.can_activate,
    can_deactivate: !!raw.can_deactivate,
  };
}

// user_qualities is the source of truth. Catalog only fills qualities the backend
// has not seeded yet (new users), and never overwrites personalized state.
function buildQualitiesList(
  userList: QualityItem[] | null | undefined,
  catalog: QualityItem[] | null | undefined,
  archetypeCode: string,
): QualityItem[] {
  const code = archetypeCode.toUpperCase();
  const userForArchetype = (Array.isArray(userList) ? userList : [])
    .map(normalizeQualityRow)
    .filter((q): q is QualityItem => q !== null && q.archetype === code);

  const catalogForArchetype = (Array.isArray(catalog) ? catalog : [])
    .map(normalizeQualityRow)
    .filter((q): q is QualityItem => q !== null && q.archetype === code);

  const catalogDefaults = (c: QualityItem): QualityItem => {
    const free = !!c.is_free_tier;
    return {
      ...c,
      status: free ? 'INACTIVE' : 'LOCKED',
      is_completed: false,
      can_activate: free,
      can_deactivate: false,
    };
  };

  if (userForArchetype.length > 0) {
    const byId = new Map(userForArchetype.map((u) => [u.id, u]));
    for (const c of catalogForArchetype) {
      if (!byId.has(c.id)) {
        userForArchetype.push(catalogDefaults(c));
      }
    }
    return userForArchetype;
  }

  return catalogForArchetype.map(catalogDefaults);
}

export default function ArchetypeDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { name, fromNotification } = useLocalSearchParams<{
    name: string;
    fromNotification?: string;
  }>();
  const code = (typeof name === 'string' ? name : '').toUpperCase();
  const sign = findSign(code);
  const meta = getArchetypeMeta(code);

  // Localized override for the archetype name + ruler/element/description.
  // Backend returns the dynamic content already in the chosen language; the
  // static intro lives in the i18n bundle so we don't have to hard-code BG.
  const localized = code
    ? {
        label: t(`archetypeMeta.${code}.label`, { defaultValue: '' }),
        ruler: t(`archetypeMeta.${code}.ruler`, { defaultValue: '' }),
        element: t(`archetypeMeta.${code}.element`, { defaultValue: '' }),
        description: t(`archetypeMeta.${code}.description`, { defaultValue: '' }),
      }
    : { label: '', ruler: '', element: '', description: '' };

  const title =
    localized.label || sign?.label || meta?.label || titleCase(code);
  const rulerLabel = localized.ruler || meta?.ruler || '';
  // Map the canonical English ruler (meta.ruler) to its planet symbol image so
  // the symbol is correct per sign rather than always showing the Sun.
  const rulerIcon = meta ? PLANET_ICONS[meta.ruler] ?? null : null;
  const elementLabel = localized.element || meta?.elementLabel || '';
  const description = localized.description || meta?.description || '';

  const [allQualities, setAllQualities] = useState<QualityItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('mastering');
  const [explainExpanded, setExplainExpanded] = useState(false);
  // Authoritative completion percentage from the backend
  // (user_archetypes.completed_percentage). null until first loaded; we fall
  // back to a local optimistic estimate so the bar moves instantly.
  const [serverPercent, setServerPercent] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  // Optimistically patches a single quality in local state by id.
  const patchQuality = useCallback((id: number, patch: Partial<QualityItem>) => {
    setAllQualities((prev) =>
      prev ? prev.map((q) => (q.id === id ? { ...q, ...patch } : q)) : prev,
    );
  }, []);

  const animateList = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const toggleExplain = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExplainExpanded((v) => !v);
  }, []);

  const isMounted = useRef(true);
  const hasLoadedOnce = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const pendingRestoreY = useRef<number | null>(null);
  const scrollRestoreKey = `archetype:${code}`;

  const applyPendingScroll = useCallback(() => {
    const y = pendingRestoreY.current;
    if (y == null) return;
    scrollRef.current?.scrollTo({ y, animated: false });
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Switching archetype (e.g. Leo → Virgo) must not reuse the previous list.
  useEffect(() => {
    hasLoadedOnce.current = false;
    pendingRestoreY.current = null;
    setAllQualities(null);
    setServerPercent(null);
    setLoading(true);
  }, [code]);

  // Decode a pack image early so the first quality open doesn't hitch.
  useEffect(() => {
    if (!code) return;
    let src: any = null;
    if (code === 'PISCES') src = pickPiscesReadingBackground();
    else if (code === 'LIBRA') src = pickLibraReadingBackground();
    else if (code === 'AQUARIUS') src = pickAquariusReadingBackground();
    else if (code === 'CAPRICORN') src = pickCapricornReadingBackground();
    else if (code === 'SAGITTARIUS') src = pickSagittariusReadingBackground();
    else if (code === 'SCORPIO') src = pickScorpioReadingBackground();
    else if (code === 'VIRGO') src = pickVirgoReadingBackground();
    else if (code === 'LEO') src = pickLeoReadingBackground();
    else if (code === 'CANCER') src = pickCancerReadingBackground();
    else if (code === 'GEMINI') src = pickGeminiReadingBackground();
    else if (code === 'TAURUS') src = pickTaurusReadingBackground();
    else if (code === 'ARIES') src = pickAriesReadingBackground();
    if (!src) return;
    try {
      const resolved = Image.resolveAssetSource(src);
      if (resolved?.uri) Image.prefetch(resolved.uri);
    } catch {
      // best-effort
    }
  }, [code]);

  const loadQualities = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? hasLoadedOnce.current;
    if (!silent) setLoading(true);
    const codeUpper = code.toUpperCase();
    try {
      const userList = await getUserQualities({ attemptSeed: true });
      if (!isMounted.current) return;

      if (userList === null) {
        if (silent && hasLoadedOnce.current) return;
        if (isMounted.current) setAllQualities([]);
        return;
      }

      const fromQualities = isUserPremiumFromQualities(userList);
      if (fromQualities === true && isMounted.current) {
        setIsPremium(true);
      }

      const userForArchetype = userList
        .map(normalizeQualityRow)
        .filter(
          (q: QualityItem | null): q is QualityItem =>
            q !== null && q.archetype === codeUpper,
        );

      let catalog: QualityItem[] | null = null;
      if (userForArchetype.length === 0) {
        catalog = (await getArchetypeQualities(code)) as QualityItem[] | null;
        if (!isMounted.current) return;
      }

      const items = buildQualitiesList(userList, catalog, code);
      setAllQualities(items);
      hasLoadedOnce.current = true;
    } catch (e) {
      console.log('qualities load error:', (e as any)?.message ?? String(e));
      if (isMounted.current && !silent) setAllQualities([]);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getUserProfile();
        if (cancelled || !profile) return;
        if (isUserPremiumFromProfile(profile)) {
          setIsPremium(true);
        }
      } catch (e) {
        console.log(
          'premium profile check failed:',
          (e as any)?.message ?? String(e),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshProgress = useCallback(async () => {
    try {
      const pct = await getArchetypeCompletedPercentage(code);
      if (pct !== null && isMounted.current) {
        setServerPercent(pct);
      }
    } catch (e) {
      console.log('progress refresh failed:', (e as any)?.message ?? String(e));
    }
  }, [code]);

  const syncFromServer = useCallback(async () => {
    await Promise.all([
      loadQualities({ silent: true }),
      refreshProgress(),
    ]);
  }, [loadQualities, refreshProgress]);

  // Re-fetch from the backend whenever this screen becomes visible again so
  // learned / active state and progress survive navigation away and back.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const restoreY = takeScrollRestore(scrollRestoreKey);
      if (restoreY != null) {
        pendingRestoreY.current = restoreY;
        applyPendingScroll();
        requestAnimationFrame(applyPendingScroll);
      }

      (async () => {
        await loadQualities({ silent: hasLoadedOnce.current });
        await refreshProgress();
        if (cancelled) return;
        if (pendingRestoreY.current != null) {
          applyPendingScroll();
          requestAnimationFrame(() => {
            applyPendingScroll();
            pendingRestoreY.current = null;
          });
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [loadQualities, refreshProgress, scrollRestoreKey, applyPendingScroll]),
  );

  useLayoutEffect(() => {
    if (pendingRestoreY.current != null) {
      applyPendingScroll();
    }
  }, [allQualities, applyPendingScroll]);

  const archetypeQualities = useMemo(() => {
    if (!allQualities) return [];
    return allQualities.filter(
      (q) => (q.archetype || '').toUpperCase() === code,
    );
  }, [allQualities, code]);

  const tabQualities = useMemo(() => {
    const wanted = TAB_TYPES[tab];
    const filtered = archetypeQualities.filter(
      (q) => (q.quality_learning_type || '').toUpperCase() === wanted,
    );
    // If backend doesn't yet split by mastering/managing, fall back to
    // showing everything under the active tab so the page isn't empty.
    const source =
      filtered.length === 0 && tab === 'mastering' ? archetypeQualities : filtered;
    // Sort order:
    //   0) ACTIVE (purple) — what you're learning right now → top
    //   1) untouched / inactive
    //   2) learned → bottom
    const rank = (q: QualityItem) => {
      if (q.is_completed) return 2;
      if (q.status === 'ACTIVE') return 0;
      return 1;
    };
    return [...source].sort((a, b) => rank(a) - rank(b));
  }, [archetypeQualities, tab]);

  const totalCount = tabQualities.length;
  const lessonsCount = totalCount || archetypeQualities.length;
  const lessonsLabel = t('archetype.lessons', { count: lessonsCount });
  const statsLoading = allQualities === null;
  const progressLoading = statsLoading || (loading && serverPercent === null);

  // Local optimistic estimate so the bar moves the instant a quality is marked
  // learned, before the backend round-trip completes.
  const localPercent = useMemo(() => {
    if (archetypeQualities.length === 0) return 0;
    const done = archetypeQualities.filter((q) => q.is_completed).length;
    return Math.round((done / archetypeQualities.length) * 100);
  }, [archetypeQualities]);

  // Single progress bar: prefer the backend's authoritative percentage; fall
  // back to the local estimate while it's loading / being reconciled.
  const progressPercent = serverPercent != null ? serverPercent : localPercent;

  const hasLockedAny = archetypeQualities.some((q) => q.status === 'LOCKED');

  const showPaywall = useCallback(() => {
    Alert.alert(
      t('archetype.premiumQualityTitle'),
      t('archetype.premiumQualityBody'),
      [
        { text: t('common.notNow'), style: 'cancel' },
        { text: t('common.seePlan'), onPress: () => router.push('/subscription') },
      ],
    );
  }, [router, t]);

  const showProgressionLock = useCallback(() => {
    Alert.alert(
      t('archetype.progressionLockTitle'),
      t('archetype.progressionLockBody'),
      [{ text: t('common.ok') }],
    );
  }, [t]);

  // LOCKED alone is not proof the user needs a subscription. Prefer
  // lock_reason when present; otherwise subscribers get a progression
  // message and free users get the paywall.
  const handleLockedQuality = useCallback(
    (quality?: QualityItem) => {
      const reason = String(
        quality?.lock_reason || (quality as any)?.lockReason || '',
      ).toLowerCase();
      if (
        reason === 'subscription' ||
        reason === 'premium' ||
        reason === 'paywall' ||
        reason === 'not_subscribed'
      ) {
        showPaywall();
        return;
      }
      if (
        reason === 'progression' ||
        reason === 'daily_limit' ||
        reason === 'quota' ||
        reason === 'daily' ||
        reason === 'enrollment'
      ) {
        showProgressionLock();
        return;
      }
      if (isPremium) {
        showProgressionLock();
        return;
      }
      showPaywall();
    },
    [isPremium, showPaywall, showProgressionLock],
  );

  // Chevron opens the reading page only — activation is via row tap.
  const openQuality = useCallback(
    (quality: QualityItem) => {
      if (quality.status === 'LOCKED') {
        handleLockedQuality(quality);
        return;
      }

      rememberScroll(scrollRestoreKey, scrollYRef.current);
      router.push({
        pathname: '/archetype/quality/[id]',
        params: {
          id: String(quality.id),
          name: code,
          title: quality.title ?? '',
          text: quality.text ?? '',
        },
      } as any);
    },
    [router, code, handleLockedQuality, scrollRestoreKey],
  );

  // Tap: toggle notification activation (purple = active in daily insights).
  const toggleActive = useCallback(
    async (quality: QualityItem) => {
      if (quality.status === 'LOCKED') {
        handleLockedQuality(quality);
        return;
      }
      if (quality.is_completed) return;

      const goingActive = quality.status !== 'ACTIVE';
      if (goingActive && !quality.can_activate) return;
      if (!goingActive && !quality.can_deactivate) return;

      animateList();
      patchQuality(quality.id, {
        status: goingActive ? 'ACTIVE' : 'INACTIVE',
        can_activate: !goingActive,
        can_deactivate: goingActive,
      });
      try {
        await setQualityActivation(quality.id, goingActive);
        await syncFromServer();
      } catch (e) {
        const msg = (e as any)?.message ?? String(e);
        console.log('toggle active failed:', msg);
        if (/locked/i.test(msg)) handleLockedQuality(quality);
        await syncFromServer();
      }
    },
    [patchQuality, handleLockedQuality, animateList, syncFromServer],
  );

  // Swipe right: mark as learned (turns green, sinks to bottom).
  const markLearned = useCallback(
    async (quality: QualityItem) => {
      if (quality.status === 'LOCKED' || quality.is_completed) return;
      animateList();
      patchQuality(quality.id, { is_completed: true });
      setServerPercent(null);
      try {
        await setQualityCompletion(quality.id, true);
        await syncFromServer();
      } catch (e) {
        console.log('mark learned failed:', (e as any)?.message ?? String(e));
        await syncFromServer();
      }
    },
    [patchQuality, animateList, syncFromServer],
  );

  // Swipe left on a learned row: revert completion via the backend.
  const markUnlearned = useCallback(
    async (quality: QualityItem) => {
      if (quality.status === 'LOCKED' || !quality.is_completed) return;
      animateList();
      patchQuality(quality.id, { is_completed: false });
      setServerPercent(null);
      try {
        await setQualityCompletion(quality.id, false);
        await syncFromServer();
      } catch (e) {
        console.log('mark unlearned failed:', (e as any)?.message ?? String(e));
        await syncFromServer();
      }
    },
    [patchQuality, animateList, syncFromServer],
  );

  const elementColors = meta ? ELEMENT_COLORS[meta.element] : ELEMENT_COLORS.fire;
  const elementBackground = meta ? ELEMENT_BACKGROUNDS[meta.element] : null;

  const handleBack = useCallback(() => {
    if (fromNotification === '1') {
      router.replace('/home');
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/home');
  }, [fromNotification, router]);

  return (
    <View style={styles.wrapper}>
      {elementBackground ? (
        <>
          <Image
            source={elementBackground}
            style={styles.elementBg}
            resizeMode="cover"
          />
          <View style={styles.elementBgOverlay} />
        </>
      ) : null}
      <ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
        onContentSizeChange={() => {
          if (pendingRestoreY.current != null) {
            applyPendingScroll();
          }
        }}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoTitleRow}>
            {sign ? (
              <View style={styles.headerIcon}>
                <ZodiacGlyph code={sign.code} size={32} color="#D3D5FB" />
              </View>
            ) : null}
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {title.toUpperCase()}
            </Text>
          </View>

          {meta ? (
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('archetype.rulerLabel')}</Text>
                <View style={styles.metaValueRow}>
                  <Text style={styles.metaValue}>{rulerLabel}</Text>
                  {rulerIcon ? (
                    <Image source={rulerIcon} style={styles.metaPlanetIcon} />
                  ) : null}
                </View>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('archetype.elementLabel')}</Text>
                <View style={styles.metaValueRow}>
                  <Text style={styles.metaValue}>{elementLabel}</Text>
                  <Ionicons
                    name={
                      meta.element === 'fire'
                        ? 'flame'
                        : meta.element === 'water'
                        ? 'water'
                        : meta.element === 'air'
                        ? 'cloud-outline'
                        : 'leaf'
                    }
                    size={13}
                    color={elementColors[0]}
                    style={styles.metaIcon}
                  />
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {description ? (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>
        ) : null}

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('archetype.sectionTitle')}</Text>
        </View>

        <View style={styles.lessonsRow}>
          <View style={styles.lessonsBadge}>
            <Ionicons name="bookmark" size={12} color="#D3D5FB" />
            {statsLoading ? (
              <ActivityIndicator size="small" color="#D3D5FB" style={styles.lessonsLoader} />
            ) : (
              <Text style={styles.lessonsBadgeText}>{lessonsLabel}</Text>
            )}
          </View>
          {hasLockedAny ? (
            <LinearGradient
              colors={['#577CFB', '#B283ED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.proPill}
            >
              <Text style={styles.proPillText}>{t('archetype.pro')}</Text>
            </LinearGradient>
          ) : null}
        </View>

        <Text style={styles.sectionSub}>{t('archetype.intro')}</Text>

        <Text style={styles.unlockBlock}>
          <Text style={styles.unlockHeader}>{t('archetype.learningHeader')}</Text>
          <Text> {t('archetype.learningDescription')}</Text>
        </Text>
        <Text style={styles.unlockBlock}>
          <Text style={styles.unlockHeader}>{t('archetype.owningHeader')}</Text>
          <Text> {t('archetype.owningDescription')}</Text>
        </Text>

        <TouchableOpacity
          style={styles.explainToggle}
          onPress={toggleExplain}
          activeOpacity={0.7}
        >
          <Text style={styles.explainToggleText}>
            {explainExpanded ? t('archetype.showLess') : t('archetype.readMore')}
          </Text>
          <Ionicons
            name={explainExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#D3D5FB"
          />
        </TouchableOpacity>

        {explainExpanded ? (
          <View style={styles.explainBody}>
            <Text style={styles.unlockBlock}>{t('archetype.growthIntro')}</Text>
            <Text style={styles.unlockBlock}>
              {t('archetype.masteringSectionExplain')}
            </Text>
            <Text style={styles.unlockBlock}>
              {t('archetype.managingSectionExplain')}
            </Text>
            <Text style={styles.unlockBlockBold}>{t('archetype.explorePace')}</Text>
          </View>
        ) : null}

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'mastering' && styles.tabActive]}
            onPress={() => setTab('mastering')}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, tab === 'mastering' && styles.tabTextActive]}>
              {t('archetype.tabMastering')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'managing' && styles.tabActive]}
            onPress={() => setTab('managing')}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, tab === 'managing' && styles.tabTextActive]}>
              {t('archetype.tabManaging')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressBlock}>
          <ProgressRow
            label={t('archetype.progress')}
            percent={progressPercent}
            percentLabel={t('archetype.progressPercent', { percent: progressPercent })}
            loading={progressLoading}
          />
        </View>

        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>{t('archetype.legendTitle')}</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotTap]}>
              <Ionicons name="hand-left" size={13} color="#D3D5FB" />
            </View>
            <Text style={styles.legendText}>{t('archetype.legendTap')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotLearned]}>
              <Ionicons name="arrow-forward" size={13} color="#7DE2A8" />
            </View>
            <Text style={styles.legendText}>{t('archetype.legendLearned')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotUnlearn]}>
              <Ionicons name="arrow-back" size={13} color="#C7C9D1" />
            </View>
            <Text style={styles.legendText}>{t('archetype.legendUnlearn')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotOpen]}>
              <Ionicons name="chevron-forward" size={13} color="#D3D5FB" />
            </View>
            <Text style={styles.legendText}>{t('archetype.legendOpen')}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : tabQualities.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>{t('archetype.emptyQualities')}</Text>
          </View>
        ) : (
          <View style={styles.qualityList}>
            {tabQualities.map((q) => (
              <QualityRow
                key={q.id}
                quality={q}
                onToggle={toggleActive}
                onOpen={openQuality}
                onLearned={markLearned}
                onUnlearned={markUnlearned}
                learnedLabel={t('archetype.learnedLabel')}
                openHint={t('archetype.openHint')}
                learnedAction={t('archetype.learnedAction')}
                unlearnAction={t('archetype.unlearnAction')}
                newLabel={t('archetype.newLabel')}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ProgressRow({
  label,
  percent,
  percentLabel,
  loading = false,
}: {
  label: string;
  percent: number;
  percentLabel: string;
  loading?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.progressRow}>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.progressBarTrack}>
        {!loading ? (
          <LinearGradient
            colors={['#577CFB', '#B283ED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${clamped}%` }]}
          />
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color="#D3D5FB" style={styles.progressLoader} />
      ) : (
        <Text style={styles.progressPercent}>{percentLabel}</Text>
      )}
    </View>
  );
}

/**
 * Frosts a whole locked row. Sits above the row content but below the PRO
 * badge, so the badge stays sharp while everything behind it is obscured.
 */
function LockedFrost() {
  return (
    <>
      <BlurView
        intensity={28}
        tint="dark"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        {...(Platform.OS === 'android'
          ? { experimentalBlurMethod: 'dimezisBlurView' as const }
          : null)}
      />
      {/* Keeps the row unreadable where the platform blur is weak. */}
      <LinearGradient
        colors={['rgba(14,16,32,0.58)', 'rgba(14,16,32,0.30)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </>
  );
}

function QualityRow({
  quality,
  onToggle,
  onOpen,
  onLearned,
  onUnlearned,
  learnedLabel,
  openHint,
  learnedAction,
  unlearnAction,
  newLabel,
}: {
  quality: QualityItem;
  onToggle: (q: QualityItem) => void;
  onOpen: (q: QualityItem) => void;
  onLearned: (q: QualityItem) => void;
  onUnlearned: (q: QualityItem) => void;
  learnedLabel: string;
  openHint: string;
  learnedAction: string;
  unlearnAction: string;
  newLabel: string;
}) {
  const isLocked = quality.status === 'LOCKED';
  const isLearned = quality.is_completed && !isLocked;
  const isActive = quality.status === 'ACTIVE' && !isLearned;
  const isNew = !!quality.is_recently_unlocked && !isLearned && !isLocked;
  const swipeRef = useRef<Swipeable>(null);

  const renderLeftActions = () => {
    if (isLearned) return null;
    return (
      <View style={[styles.swipeAction, styles.swipeLearned]}>
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.swipeActionText}>{learnedAction}</Text>
      </View>
    );
  };

  const renderRightActions = () => {
    if (!isLearned) return null;
    return (
      <View style={[styles.swipeAction, styles.swipeUnlearn]}>
        <Ionicons name="arrow-undo" size={20} color="#fff" />
        <Text style={styles.swipeActionText}>{unlearnAction}</Text>
      </View>
    );
  };

  const handleSwipeOpen = (direction: 'left' | 'right') => {
    swipeRef.current?.close();
    requestAnimationFrame(() => {
      if (direction === 'left') onLearned(quality);
      else onUnlearned(quality);
    });
  };

  const iconBubble = isLearned ? (
    <View style={[styles.qualityIconBubble, styles.qualityIconBubbleLearned]}>
      <Ionicons name="checkmark" size={18} color="#fff" />
    </View>
  ) : isActive ? (
    <LinearGradient
      colors={['#577CFB', '#B283ED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.qualityIconBubble}
    >
      <Ionicons name="flash" size={18} color="#fff" />
    </LinearGradient>
  ) : (
    <View style={[styles.qualityIconBubble, styles.qualityIconBubbleInactive]}>
      <Ionicons name="flash" size={18} color="#D3D5FB" />
    </View>
  );

  const textCol = (
    <View style={styles.qualityTextCol}>
      <View style={styles.qualityTitleRow}>
        <Text
          style={styles.qualityTitle}
          numberOfLines={isLocked ? 1 : undefined}
        >
          {quality.title}
        </Text>
        {isLearned ? (
          <View style={styles.learnedPill}>
            <Ionicons name="checkmark" size={10} color="#7DE2A8" />
            <Text style={styles.learnedPillText}>{learnedLabel}</Text>
          </View>
        ) : isNew ? (
          <View style={styles.newPill}>
            <Ionicons name="sparkles" size={10} color="#FFD56B" />
            <Text style={styles.newPillText}>{newLabel}</Text>
          </View>
        ) : null}
      </View>
      {!!quality.text && (
        <Text style={styles.qualitySubtitle} numberOfLines={1}>
          {quality.text}
        </Text>
      )}
    </View>
  );

  const content = (
    <TouchableOpacity
      style={[
        styles.qualityRow,
        isActive && styles.qualityRowActive,
        isLearned && styles.qualityRowLearned,
        isNew && styles.qualityRowNew,
        isLocked && styles.qualityRowLocked,
      ]}
      onPress={() => onToggle(quality)}
      activeOpacity={0.85}
    >
      {iconBubble}
      {textCol}

      {isLocked ? <LockedFrost /> : null}

      {isLocked ? (
        <LinearGradient
          colors={['#577CFB', '#B283ED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.qualityProBadge}
        >
          <Ionicons name="diamond" size={10} color="#fff" />
          <Text style={styles.qualityProBadgeText}>PRO</Text>
        </LinearGradient>
      ) : (
        <TouchableOpacity
          onPress={() => onOpen(quality)}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
          style={styles.openButton}
        >
          <Text style={styles.openButtonText}>{openHint}</Text>
          <Ionicons name="chevron-forward" size={16} color="#D3D5FB" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (isLocked) return content;

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      leftThreshold={56}
      rightThreshold={56}
      onSwipeableOpen={(direction) => handleSwipeOpen(direction)}
    >
      {content}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#141519',
  },
  elementBg: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  elementBgOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 16, 20, 0.4)',
  },
  scroll: {
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backButton: {
    backgroundColor: 'rgba(57, 60, 71, 0.6)',
    borderRadius: 999,
    padding: 10,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(140,140,200,0.16)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'CooperLtBT-Bold',
    letterSpacing: 1,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  metaItem: {
    alignItems: 'flex-start',
  },
  metaLabel: {
    color: '#9C9CA6',
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: 'Nunito-Bold',
  },
  metaValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaValue: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
  },
  metaIcon: {
    marginLeft: 4,
  },
  metaPlanetIcon: {
    width: 14,
    height: 14,
    marginLeft: 4,
    resizeMode: 'contain',
    tintColor: '#D3D5FB',
  },
  descriptionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(140,140,200,0.18)',
    marginBottom: 24,
  },
  descriptionText: {
    color: '#D3D5FB',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'SFProDisplay-Regular',
  },
  sectionTitleRow: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'CooperLtBT-Bold',
    lineHeight: 28,
  },
  lessonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  lessonsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  lessonsBadgeText: {
    color: '#D3D5FB',
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
  },
  lessonsLoader: {
    transform: [{ scale: 0.75 }],
  },
  proPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proPillText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.5,
  },
  sectionSub: {
    color: '#9C9CA6',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 12,
  },
  explainToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(140,140,200,0.3)',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 22,
    marginBottom: 16,
  },
  explainToggleText: {
    color: '#D3D5FB',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
  },
  explainBody: {
    marginBottom: 4,
  },
  unlockBlock: {
    color: '#9C9CA6',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 14,
  },
  unlockBlockBold: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Nunito-Bold',
    marginBottom: 14,
  },
  unlockHeader: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Nunito-Bold',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 32,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    color: '#9C9CA6',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  tabTextActive: {
    color: '#141519',
  },
  progressBlock: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 20,
  },
  progressRow: {
    flex: 1,
  },
  progressLabel: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: 4,
    borderRadius: 4,
  },
  progressPercent: {
    color: '#9C9CA6',
    fontSize: 11,
    fontFamily: 'SFProDisplay-Regular',
    minHeight: 14,
  },
  progressLoader: {
    alignSelf: 'flex-start',
    transform: [{ scale: 0.75 }],
  },
  legendCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(140,140,200,0.18)',
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  legendTitle: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
    marginBottom: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDotTap: {
    backgroundColor: 'rgba(122, 140, 255, 0.18)',
  },
  legendDotLearned: {
    backgroundColor: 'rgba(125, 226, 168, 0.16)',
  },
  legendDotUnlearn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  legendDotOpen: {
    backgroundColor: 'rgba(211, 213, 251, 0.12)',
  },
  legendText: {
    flex: 1,
    color: '#C7C9D1',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'SFProDisplay-Regular',
  },
  loaderRow: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyRow: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9C9CA6',
    fontSize: 13,
    fontFamily: 'SFProDisplay-Regular',
    textAlign: 'center',
  },
  qualityList: {
    gap: 10,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(140,140,200,0.14)',
    // Clips the locked-row frost overlay to the rounded corners.
    overflow: 'hidden',
  },
  qualityRowActive: {
    backgroundColor: 'rgba(122, 140, 255, 0.16)',
    borderColor: 'rgba(122, 140, 255, 0.55)',
  },
  qualityRowLearned: {
    backgroundColor: 'rgba(125, 226, 168, 0.1)',
    borderColor: 'rgba(125, 226, 168, 0.45)',
  },
  qualityRowNew: {
    borderColor: 'rgba(255, 213, 107, 0.55)',
    shadowColor: '#FFD56B',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 6,
  },
  openButtonText: {
    color: '#D3D5FB',
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
  },
  swipeAction: {
    width: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 16,
    marginLeft: 8,
    marginRight: 8,
  },
  swipeLearned: {
    backgroundColor: '#3E9E6B',
  },
  swipeUnlearn: {
    backgroundColor: '#5A5C66',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
  },
  qualityIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  qualityIconBubbleInactive: {
    backgroundColor: 'rgba(211, 213, 251, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(170, 154, 192, 0.4)',
  },
  qualityIconBubbleLearned: {
    backgroundColor: '#3E9E6B',
  },
  qualityTextCol: {
    flex: 1,
  },
  qualityRowLocked: {
    backgroundColor: 'rgba(122, 140, 255, 0.07)',
    borderColor: 'rgba(140, 140, 200, 0.22)',
  },
  qualityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  qualityTitle: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
  },
  learnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(125, 226, 168, 0.14)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  learnedPillText: {
    color: '#7DE2A8',
    fontSize: 10,
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.3,
  },
  newPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 213, 107, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newPillText: {
    color: '#FFD56B',
    fontSize: 10,
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.3,
  },
  qualitySubtitle: {
    color: '#9C9CA6',
    fontSize: 12,
    fontFamily: 'SFProDisplay-Regular',
    marginTop: 2,
  },
  qualityProBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    // Keeps the badge above the frost overlay on both platforms.
    zIndex: 1,
  },
  qualityProBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.5,
  },
});
