import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Alert } from '../components/AppAlert';
import { ZODIAC_SIGNS } from '../components/Astrowheel';
import ZodiacGlyph from '../components/ZodiacGlyph';
import {
  getCommunityUsers,
  getUserProfile,
  patchUserProfile,
} from '../services/api';
import {
  normalizeHandle,
  socialProfileUrl,
  type SocialPlatform,
} from '../services/socialLinks';

const communityBanner = require('../assets/images/community-space.jpg');

type FilterKey = 'sun' | 'moon' | 'ascendant' | 'learning';
type Filters = Record<FilterKey, string>;
type SharingKey =
  | 'show_sun_sign'
  | 'show_moon_sign'
  | 'show_ascendant'
  | 'show_learning_archetypes'
  | 'show_socials';
type SharingSettings = Record<SharingKey, boolean>;

interface CommunityMember {
  id: string | number;
  name: string;
  profile_picture_url: string | null;
  sun_sign: string | null;
  moon_sign: string | null;
  ascendant: string | null;
  learning_archetypes: string[] | null;
  social_acc_facebook: string | null;
  social_acc_instagram: string | null;
}

const EMPTY_FILTERS: Filters = {
  sun: '',
  moon: '',
  ascendant: '',
  learning: '',
};

// How many members are on screen at once. The backend decides its own page
// size, so we window the loaded list as well: "Load more" first reveals more
// of what we already have and only fetches another page once it runs out.
const PAGE_SIZE = 12;

// What we write when someone opts into the community. The API defaults every
// flag to false, so opting in is the explicit action that turns sharing on.
const DEFAULT_SHARING: SharingSettings = {
  show_sun_sign: true,
  show_moon_sign: true,
  show_ascendant: true,
  show_learning_archetypes: true,
  show_socials: true,
};

const SHARING_OPTIONS: { key: SharingKey; label: string }[] = [
  { key: 'show_sun_sign', label: 'shareSun' },
  { key: 'show_moon_sign', label: 'shareMoon' },
  { key: 'show_ascendant', label: 'shareAscendant' },
  { key: 'show_learning_archetypes', label: 'shareLearning' },
  { key: 'show_socials', label: 'shareSocials' },
];

function sharingFromProfile(profile: any): SharingSettings {
  const settings = profile?.user_settings ?? {};
  return {
    show_sun_sign: settings.show_sun_sign === true,
    show_moon_sign: settings.show_moon_sign === true,
    show_ascendant: settings.show_ascendant === true,
    show_learning_archetypes: settings.show_learning_archetypes === true,
    show_socials: settings.show_socials === true,
  };
}

// Sharing the socials flag is pointless until there is a handle to share, so
// the switch checks the owner's own profile before it can be turned on.
function hasAnyHandle(profile: any) {
  const filled = (value: any) => typeof value === 'string' && !!value.trim();
  return filled(profile?.social_acc_facebook) || filled(profile?.social_acc_instagram);
}

function normalizeMember(raw: any, index: number): CommunityMember {
  const nullableCode = (value: any) =>
    typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null;
  return {
    id: raw?.id ?? `member-${index}`,
    name:
      typeof raw?.name === 'string' && raw.name.trim()
        ? raw.name.trim()
        : '',
    profile_picture_url:
      typeof raw?.profile_picture_url === 'string' &&
      raw.profile_picture_url.trim()
        ? raw.profile_picture_url.trim()
        : null,
    sun_sign: nullableCode(raw?.sun_sign),
    moon_sign: nullableCode(raw?.moon_sign),
    ascendant: nullableCode(raw?.ascendant),
    learning_archetypes: Array.isArray(raw?.learning_archetypes)
      ? raw.learning_archetypes
          .map(nullableCode)
          .filter((code: string | null): code is string => !!code)
      : null,
    social_acc_facebook: normalizeHandle(raw?.social_acc_facebook),
    social_acc_instagram: normalizeHandle(raw?.social_acc_instagram),
  };
}

export default function CommunityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const requestId = useRef(0);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selector, setSelector] = useState<FilterKey | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [next, setNext] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [participating, setParticipating] = useState(false);
  const [participationSaving, setParticipationSaving] = useState(false);
  const [sharingExpanded, setSharingExpanded] = useState(false);
  const [sharingSaving, setSharingSaving] = useState<SharingKey | null>(null);
  const [hasSocials, setHasSocials] = useState(false);
  const [sharingSettings, setSharingSettings] =
    useState<SharingSettings>(DEFAULT_SHARING);

  const clearDirectory = useCallback(() => {
    requestId.current += 1;
    setMembers([]);
    setVisibleCount(PAGE_SIZE);
    setNext(null);
    setTotal(0);
    setError(null);
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, []);

  const load = useCallback(
    async (
      mode: 'replace' | 'append' | 'refresh' = 'replace',
      nextUrl?: string,
    ) => {
      if (!participating) return;
      const id = ++requestId.current;
      if (mode === 'append') setLoadingMore(true);
      else if (mode === 'replace') setLoading(true);
      setError(null);
      try {
        const data: any = await getCommunityUsers(nextUrl || filters);
        if (id !== requestId.current) return;
        const incoming: CommunityMember[] = (
          Array.isArray(data?.results) ? data.results : []
        ).map(normalizeMember);
        setMembers((current) => {
          const combined = mode === 'append' ? [...current, ...incoming] : incoming;
          const seen = new Set<string>();
          return combined.filter((member) => {
            const key = String(member.id);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
        setVisibleCount((current) =>
          mode === 'append' ? current + PAGE_SIZE : PAGE_SIZE,
        );
        setNext(typeof data?.next === 'string' ? data.next : null);
        setTotal(typeof data?.count === 'number' ? data.count : incoming.length);
      } catch (e: any) {
        if (id !== requestId.current) return;
        console.log('[Community] load failed:', e?.status ?? '', e?.message ?? String(e));
        const status = Number(e?.status);
        const endpointMissing = status === 404 || status === 501;
        // Show our own copy rather than whatever the server returned, so a
        // missing route can't render an HTML error page into the screen.
        setError(
          endpointMissing ? t('community.unavailable') : t('community.error'),
        );
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [filters, participating, t],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        let visible = false;
        let settings = DEFAULT_SHARING;
        let socials = false;
        try {
          const profile: any = await getUserProfile();
          visible = profile?.is_profile_visible === true;
          settings = sharingFromProfile(profile);
          socials = hasAnyHandle(profile);
        } catch (e) {
          console.log('[Community] profile load failed:', (e as any)?.message ?? String(e));
        }
        if (!active) return;
        setParticipating(visible);
        setSharingSettings(settings);
        setHasSocials(socials);
        setProfileReady(true);
        if (!visible) clearDirectory();
      })();
      return () => {
        active = false;
      };
    }, [clearDirectory]),
  );

  useEffect(() => {
    if (!profileReady) return;
    if (participating) {
      void load('replace');
      return;
    }
    clearDirectory();
  }, [clearDirectory, filters, load, participating, profileReady]);

  const selectFilter = (value: string) => {
    if (!selector) return;
    setFilters((current) => ({ ...current, [selector]: value }));
    setSelector(null);
  };

  const refresh = () => {
    setRefreshing(true);
    void load('refresh');
  };

  const visibleMembers = members.slice(0, visibleCount);
  const hasMore = visibleCount < members.length || !!next;

  const showMore = () => {
    if (loadingMore) return;
    if (visibleCount < members.length) {
      setVisibleCount((current) => current + PAGE_SIZE);
      return;
    }
    if (next) void load('append', next);
  };

  const toggleParticipation = async (value: boolean) => {
    if (participationSaving) return;
    const previous = participating;
    const previousSettings = sharingSettings;
    // Opting in turns everything on, except socials for someone who hasn't
    // saved a handle yet — there would be nothing behind the switch.
    const nextSettings = value
      ? { ...DEFAULT_SHARING, show_socials: hasSocials }
      : sharingSettings;
    setParticipating(value);
    if (value) {
      setSharingSettings(nextSettings);
      setSharingExpanded(true);
    } else {
      setSharingExpanded(false);
    }
    try {
      setParticipationSaving(true);
      await patchUserProfile({
        is_profile_visible: value,
        ...(value ? { user_settings: nextSettings } : {}),
      });
    } catch {
      setParticipating(previous);
      setSharingSettings(previousSettings);
      Alert.alert(
        t('community.participationErrorTitle'),
        t('community.participationError'),
      );
    } finally {
      setParticipationSaving(false);
    }
  };

  const toggleSharing = async (key: SharingKey, value: boolean) => {
    if (sharingSaving || participationSaving) return;
    if (key === 'show_socials' && value && !hasSocials) {
      Alert.alert(
        t('community.socialsMissingTitle'),
        t('community.socialsMissing'),
        [
          { text: t('common.notNow'), style: 'cancel' },
          {
            text: t('community.socialsMissingAction'),
            onPress: () => router.push('/edit-profile'),
          },
        ],
      );
      return;
    }
    const previous = sharingSettings[key];
    const nextSettings = { ...sharingSettings, [key]: value };
    setSharingSettings(nextSettings);
    setSharingSaving(key);
    try {
      await patchUserProfile({ user_settings: { [key]: value } });
      // The directory is built from these flags, so re-read it once saved.
      void load('refresh');
    } catch {
      setSharingSettings((current) => ({ ...current, [key]: previous }));
      Alert.alert(
        t('community.sharingErrorTitle'),
        t('community.sharingError'),
      );
    } finally {
      setSharingSaving(null);
    }
  };

  const signLabel = (code: string) =>
    t(`archetypeMeta.${code}.label`, {
      defaultValue: ZODIAC_SIGNS.find((sign) => sign.code === code)?.label || code,
    });

  // The directory response is the only source for a member, so hand the row we
  // already have to the detail screen rather than refetching it by id.
  const openMember = (member: CommunityMember) => {
    router.push({
      pathname: '/community-member',
      params: { member: JSON.stringify(member) },
    } as any);
  };

  const openSocial = async (platform: SocialPlatform, handle: string) => {
    const url = socialProfileUrl(platform, handle);
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.log('[Community] social link failed:', (e as any)?.message ?? String(e));
      Alert.alert(t('community.linkErrorTitle'), t('community.linkError'));
    }
  };

  const MemberCard = ({ member }: { member: CommunityMember }) => {
    const displayName = member.name || t('community.memberFallback');
    const socials = [
      member.social_acc_instagram && {
        platform: 'instagram' as const,
        icon: 'instagram',
        handle: member.social_acc_instagram,
      },
      member.social_acc_facebook && {
        platform: 'facebook' as const,
        icon: 'facebook-f',
        handle: member.social_acc_facebook,
      },
    ].filter(Boolean) as {
      platform: SocialPlatform;
      icon: string;
      handle: string;
    }[];
    const details = [
      member.sun_sign && [t('community.sun'), member.sun_sign],
      member.moon_sign && [t('community.moon'), member.moon_sign],
      member.ascendant && [t('community.ascendant'), member.ascendant],
    ].filter(Boolean) as string[][];
    const learning = member.learning_archetypes ?? [];
    // Sharing is opt-out per field, so a member can end up with nothing on
    // show. Say so rather than leaving the card as a name over empty space.
    const sharesNothing =
      details.length === 0 && learning.length === 0 && socials.length === 0;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => openMember(member)}
        accessibilityRole="button"
        accessibilityLabel={displayName}
      >
        <View style={styles.cardHeader}>
          {member.profile_picture_url ? (
            <Image
              source={{ uri: member.profile_picture_url }}
              style={styles.avatar}
              accessibilityLabel={t('community.avatarLabel', { name: displayName })}
            />
          ) : (
            <View
              style={[styles.avatar, styles.avatarPlaceholder]}
              accessibilityLabel={t('community.avatarPlaceholder', {
                name: displayName,
              })}
            >
              <Ionicons name="person" size={28} color="#A9A9B4" />
            </View>
          )}
          <Text style={styles.cardName} numberOfLines={1}>
            {displayName}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#6E6E7A" />
        </View>
        {details.length > 0 ? (
          <View style={styles.signStrip}>
            {details.map(([label, code], index) => (
              <View
                key={label}
                style={[styles.signCell, index > 0 && styles.signCellDivided]}
              >
                <ZodiacGlyph code={code} size={20} color="#C6B4EF" />
                <Text style={styles.signCellLabel}>{label}</Text>
                <Text style={styles.signCellValue} numberOfLines={1}>
                  {signLabel(code)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {learning.length > 0 ? (
          <View style={styles.learningBlock}>
            <Text style={styles.learningLabel}>{t('community.learning')}</Text>
            <View style={styles.chips}>
              {learning.map((code) => (
                <View key={code} style={styles.chip}>
                  <ZodiacGlyph code={code} size={13} color="#D8C4F4" />
                  <Text style={styles.chipText}>{signLabel(code)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        {socials.length > 0 ? (
          <View style={styles.socialRow}>
            {socials.map((social) => (
              <TouchableOpacity
                key={social.platform}
                style={styles.socialButton}
                onPress={() => void openSocial(social.platform, social.handle)}
                accessibilityRole="link"
                accessibilityLabel={t(`community.open_${social.platform}`, {
                  name: displayName,
                })}
              >
                <FontAwesome5 name={social.icon} size={16} color="#EDEDF2" brand />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        {sharesNothing ? (
          <Text style={styles.cardEmptyText}>
            {t('community.cardNothingShared')}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('community.back')}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('community.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#B283ED"
            enabled={participating}
            accessibilityLabel={t('community.refresh')}
          />
        }
      >
        <ImageBackground
          source={communityBanner}
          style={styles.banner}
          imageStyle={styles.bannerImage}
        >
          <View style={styles.bannerOverlay} />
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>{t('community.bannerTitle')}</Text>
            <Text style={styles.bannerText}>{t('community.bannerText')}</Text>
          </View>
        </ImageBackground>

        <View style={styles.participationRow}>
          <View style={styles.participationCopy}>
            <Text style={styles.participationTitle}>
              {t('community.participationTitle')}
            </Text>
            <Text style={styles.participationText}>
              {t('community.participationText')}
            </Text>
          </View>
          {profileReady ? (
            <Switch
              value={participating}
              onValueChange={(value) => void toggleParticipation(value)}
              disabled={participationSaving}
              trackColor={{ false: '#3A3C45', true: '#7667E8' }}
              thumbColor="#fff"
              accessibilityRole="switch"
              accessibilityLabel={t('community.participationTitle')}
            />
          ) : (
            <ActivityIndicator color="#B283ED" />
          )}
        </View>

        {profileReady && participating ? (
          <View style={styles.sharingCard}>
            <TouchableOpacity
              style={styles.sharingHeader}
              onPress={() => setSharingExpanded((current) => !current)}
              accessibilityRole="button"
              accessibilityState={{ expanded: sharingExpanded }}
              accessibilityLabel={t('community.sharingTitle')}
            >
              <View style={styles.sharingHeaderCopy}>
                <Text style={styles.sharingTitle}>
                  {t('community.sharingTitle')}
                </Text>
                <Text style={styles.sharingSummary}>
                  {t('community.sharingSummary', {
                    count: Object.values(sharingSettings).filter(Boolean).length,
                  })}
                </Text>
              </View>
              <Ionicons
                name={sharingExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#B283ED"
              />
            </TouchableOpacity>

            {sharingExpanded ? (
              <View style={styles.sharingOptions}>
                {SHARING_OPTIONS.map(({ key, label }) => (
                  <View key={key} style={styles.sharingOption}>
                    <Text style={styles.sharingOptionText}>
                      {t(`community.${label}`)}
                    </Text>
                    <Switch
                      value={sharingSettings[key]}
                      onValueChange={(value) => void toggleSharing(key, value)}
                      disabled={sharingSaving !== null || participationSaving}
                      trackColor={{ false: '#3A3C45', true: '#7667E8' }}
                      thumbColor="#fff"
                      accessibilityRole="switch"
                      accessibilityLabel={t(`community.${label}`)}
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {!profileReady ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#B283ED" />
          </View>
        ) : !participating ? (
          <View style={styles.stateBox}>
            <Ionicons name="lock-closed-outline" size={28} color="#B283ED" />
            <Text style={styles.stateText}>{t('community.participationLocked')}</Text>
          </View>
        ) : (
          <>
        <View style={styles.filtersHeader}>
          <Text style={styles.filtersTitle}>{t('community.filtersTitle')}</Text>
          {Object.values(filters).some(Boolean) ? (
            <TouchableOpacity
              onPress={() => setFilters(EMPTY_FILTERS)}
              accessibilityRole="button"
              accessibilityLabel={t('community.clearFilters')}
            >
              <Text style={styles.clearText}>{t('community.clearFilters')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.filters}>
          {(Object.keys(EMPTY_FILTERS) as FilterKey[]).map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.filterButton}
              onPress={() => setSelector(key)}
              accessibilityRole="button"
              accessibilityLabel={t('community.filterAccessibility', {
                filter: t(`community.filters.${key}`),
              })}
            >
              <Text style={styles.filterLabel}>{t(`community.filters.${key}`)}</Text>
              <Text style={styles.filterValue} numberOfLines={1}>
                {filters[key] ? signLabel(filters[key]) : t('community.anySign')}
              </Text>
              <Ionicons name="chevron-down" size={15} color="#B283ED" />
            </TouchableOpacity>
          ))}
        </View>

        {!loading && !error ? (
          <Text style={styles.totalText}>
            {t('community.total', { count: total })}
          </Text>
        ) : null}

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#B283ED" />
            <Text style={styles.stateText}>{t('community.loading')}</Text>
          </View>
        ) : error && members.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity
              onPress={() => void load('replace')}
              style={styles.retryButton}
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>{t('common.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        ) : members.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{t('community.empty')}</Text>
          </View>
        ) : (
          <>
            {error ? (
              <View style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{error}</Text>
                <TouchableOpacity
                  onPress={() => void load('replace')}
                  accessibilityRole="button"
                >
                  <Text style={styles.clearText}>{t('common.tryAgain')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <View style={styles.grid}>
              {visibleMembers.map((member) => (
                <MemberCard key={String(member.id)} member={member} />
              ))}
            </View>
            {hasMore ? (
              <TouchableOpacity
                style={styles.loadMore}
                disabled={loadingMore}
                onPress={showMore}
                accessibilityRole="button"
                accessibilityLabel={t('community.loadMore')}
              >
                {loadingMore ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loadMoreText}>{t('community.loadMore')}</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </>
        )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={!!selector && participating}
        transparent
        animationType="fade"
        onRequestClose={() => setSelector(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {selector ? t(`community.filters.${selector}`) : ''}
            </Text>
            <ScrollView style={styles.optionsList}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => selectFilter('')}
                accessibilityRole="button"
              >
                <Text style={styles.optionText}>{t('community.anySign')}</Text>
              </TouchableOpacity>
              {ZODIAC_SIGNS.map((sign) => (
                <TouchableOpacity
                  key={sign.code}
                  style={styles.option}
                  onPress={() => selectFilter(sign.code)}
                  accessibilityRole="button"
                >
                  <View style={styles.optionIcon}>
                    <ZodiacGlyph code={sign.code} size={22} color="#B283ED" />
                  </View>
                  <Text style={styles.optionText}>{signLabel(sign.code)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setSelector(null)}
              style={styles.closeButton}
              accessibilityRole="button"
            >
              <Text style={styles.closeText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0F1014' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    backgroundColor: 'rgba(57,60,71,0.4)',
    borderRadius: 999,
    padding: 10,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontFamily: 'CooperLtBT-Bold',
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  content: { paddingHorizontal: 20, paddingBottom: 44 },
  banner: {
    height: 150,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24,
  },
  bannerImage: { borderRadius: 18, resizeMode: 'cover' },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,8,26,0.35)',
  },
  bannerContent: { padding: 18 },
  bannerTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'CooperLtBT-Bold',
    marginBottom: 6,
  },
  bannerText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: '90%',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filtersTitle: { color: '#fff', fontSize: 18, fontFamily: 'CooperLtBT-Bold' },
  clearText: { color: '#B283ED', fontSize: 13 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterButton: {
    width: '48%',
    minHeight: 62,
    padding: 11,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: { position: 'absolute', top: 7, left: 11, color: '#8E8E99', fontSize: 10 },
  filterValue: { flex: 1, color: '#fff', fontSize: 14, marginTop: 12, marginRight: 4 },
  totalText: { color: '#9C9CA6', marginTop: 20, marginBottom: 12, fontSize: 13 },
  stateBox: { paddingVertical: 46, alignItems: 'center', gap: 14 },
  stateText: { color: '#AAAAB4', textAlign: 'center', lineHeight: 20 },
  retryButton: {
    backgroundColor: '#665FE8',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontFamily: 'Nunito-Bold' },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(220,90,100,0.12)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  inlineErrorText: { flex: 1, color: '#E5B8BC', fontSize: 12, lineHeight: 17 },
  participationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    marginBottom: 22,
  },
  participationCopy: { flex: 1 },
  sharingCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: -10,
    marginBottom: 22,
    overflow: 'hidden',
  },
  sharingHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sharingHeaderCopy: { flex: 1, paddingRight: 12 },
  sharingTitle: { color: '#fff', fontSize: 16, fontFamily: 'Nunito-Bold' },
  sharingSummary: { color: '#92929D', fontSize: 12, marginTop: 3 },
  sharingOptions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
  },
  sharingOption: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sharingOptionText: { flex: 1, color: '#D5D6E4', fontSize: 14, paddingRight: 12 },
  grid: { gap: 12, marginTop: 8 },
  card: {
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    backgroundColor: '#292B33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardName: {
    flex: 1,
    minWidth: 0,
    color: '#fff',
    fontSize: 17,
    fontFamily: 'CooperLtBT-Bold',
  },
  // The three placements read as one unit, so they sit in a panel split by
  // hairlines instead of as three lines of "label: value" text.
  signStrip: {
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 12,
  },
  signCell: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  signCellDivided: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  signCellLabel: {
    color: '#85858F',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  signCellValue: { color: '#E6E6EF', fontSize: 12.5, fontFamily: 'Nunito-Bold' },
  learningBlock: { gap: 7 },
  learningLabel: { color: '#92929D', fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(178,131,237,0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { color: '#D8C4F4', fontSize: 12 },
  cardEmptyText: { color: '#7E7E88', fontSize: 13, fontStyle: 'italic' },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  socialButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  loadMore: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#665FE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  loadMoreText: { color: '#fff', fontFamily: 'Nunito-Bold' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,9,14,0.82)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    maxHeight: '82%',
    backgroundColor: '#1B1D24',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(178,131,237,0.2)',
  },
  modalTitle: { color: '#fff', fontSize: 20, fontFamily: 'CooperLtBT-Bold', marginBottom: 12 },
  optionsList: { maxHeight: 430 },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  optionIcon: { marginRight: 12 },
  optionText: { color: '#fff', fontSize: 15 },
  closeButton: { alignItems: 'center', paddingTop: 16 },
  closeText: { color: '#B283ED', fontFamily: 'Nunito-Bold' },
  participationTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'CooperLtBT-Bold',
    marginBottom: 6,
  },
  participationText: { color: '#B8B8C2', fontSize: 13, lineHeight: 19 },
});
