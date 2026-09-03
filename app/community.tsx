// app/community.tsx
//
// "People in common" — community hub reached from the home screen banner.
// Shows users with a similar wheel, grouped by zodiac archetype, with each
// person's big-three signs (sun / moon / rising) and social links.
//
// Data comes from getSimilarUsers() (GET /archetypes/similar_users/). To keep
// sensitive data off this screen we intentionally do NOT show birth date or
// gender. Avatars use the signed profile_picture_url from the API when present.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ZODIAC_SIGNS, type ZodiacSign } from '../components/Astrowheel';
import { getSimilarUsers } from '../services/api';

const communityBanner = require('../assets/images/community-banner.png');

// Render order for the zodiac sections.
const SECTION_ORDER = [
  'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
  'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES',
];

const ZODIAC_BY_CODE: Record<string, ZodiacSign> = ZODIAC_SIGNS.reduce(
  (acc, sign) => {
    acc[sign.code] = sign;
    return acc;
  },
  {} as Record<string, ZodiacSign>,
);

interface CommunityUser {
  id: string;
  name: string;
  sun: string; // zodiac_sign
  moon: string; // moon_sign
  rising: string; // ascendant
  profilePictureUrl?: string;
  instagram?: string;
  facebook?: string;
}

interface CommunityGroup {
  code: string; // zodiac archetype code
  users: CommunityUser[];
}

// ── Backend normalization ──────────────────────────────────────────────────
function normalizeUser(raw: any): CommunityUser | null {
  if (!raw) return null;
  const name = String(raw.name ?? raw.full_name ?? '').trim();
  if (!name) return null;

  const up = (v: any) => (typeof v === 'string' ? v.toUpperCase() : '');
  const picture =
    typeof raw.profile_picture_url === 'string' && raw.profile_picture_url.trim()
      ? raw.profile_picture_url.trim()
      : undefined;
  return {
    id: String(raw.id ?? raw.user_id ?? Math.random()),
    name,
    sun: up(raw.zodiac_sign ?? raw.sun_sign ?? raw.sun),
    moon: up(raw.moon_sign ?? raw.moon),
    rising: up(raw.ascendant ?? raw.rising_sign ?? raw.rising),
    profilePictureUrl: picture,
    instagram: raw.social_acc_instagram || undefined,
    facebook: raw.social_acc_facebook || undefined,
  };
}

function sortByWheel(groups: CommunityGroup[]): CommunityGroup[] {
  return [...groups].sort((a, b) => {
    const ia = SECTION_ORDER.indexOf(a.code);
    const ib = SECTION_ORDER.indexOf(b.code);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

// Builds groups from a flat list of users by spreading each user under every
// archetype they're learning (fallback when the backend returns a flat list
// instead of pre-grouped data).
function groupFlatUsers(list: any[]): CommunityGroup[] {
  const byCode = new Map<string, CommunityUser[]>();
  list.forEach((raw) => {
    const user = normalizeUser(raw);
    if (!user) return;
    const codes: string[] = Array.isArray(raw?.learning_archetypes)
      ? raw.learning_archetypes
          .map((c: any) => (typeof c === 'string' ? c.toUpperCase() : ''))
          .filter(Boolean)
      : [];
    // If a user has no learning_archetypes, fall back to their sun sign so
    // they still show up somewhere.
    const targets = codes.length ? codes : user.sun ? [user.sun] : [];
    targets.forEach((code) => {
      if (!byCode.has(code)) byCode.set(code, []);
      byCode.get(code)!.push(user);
    });
  });
  return Array.from(byCode.entries()).map(([code, users]) => ({ code, users }));
}

function normalizeResponse(data: any): CommunityGroup[] {
  // Preferred shape: { groups: [ { archetype, users: [...] } ] }
  if (Array.isArray(data?.groups)) {
    const parsed: CommunityGroup[] = data.groups
      .map((g: any) => {
        const code = typeof g?.archetype === 'string' ? g.archetype.toUpperCase() : '';
        const users = (Array.isArray(g?.users) ? g.users : [])
          .map(normalizeUser)
          .filter(Boolean) as CommunityUser[];
        return { code, users };
      })
      .filter((g: CommunityGroup) => g.code && g.users.length > 0);
    return sortByWheel(parsed);
  }

  // Fallback: a flat list under a few common keys, or a bare array.
  const flat = Array.isArray(data)
    ? data
    : Array.isArray(data?.users)
      ? data.users
      : Array.isArray(data?.results)
        ? data.results
        : [];
  if (flat.length) {
    return sortByWheel(groupFlatUsers(flat).filter((g) => g.code && g.users.length > 0));
  }

  return [];
}

// Social handle/url -> openable URL.
function toUrl(base: string, handle: string): string {
  const h = handle.trim();
  if (/^https?:\/\//i.test(h)) return h;
  return `${base}${h.replace(/^@/, '')}`;
}

function BigThreeItem({ code }: { code: string }) {
  const sign = ZODIAC_BY_CODE[code];
  if (!sign) return null;
  return (
    <View style={styles.bigThreeItem}>
      <Image source={sign.icon} style={styles.bigThreeIcon} />
      <Text style={styles.bigThreeLabel} numberOfLines={1}>
        {sign.label}
      </Text>
    </View>
  );
}

function SocialPill({
  icon,
  label,
  url,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  url: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => Linking.openURL(url).catch(() => {})}
    >
      <LinearGradient
        colors={['#577CFB', '#B283ED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.socialPill}
      >
        <Ionicons name={icon} size={12} color="#fff" />
        <Text style={styles.socialPillText} numberOfLines={1}>
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function UserCard({ user }: { user: CommunityUser }) {
  const hasBigThree = user.sun || user.moon || user.rising;
  return (
    <View style={styles.card}>
      {user.profilePictureUrl ? (
        <Image
          source={{ uri: user.profilePictureUrl }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatar} />
      )}

      <Text style={styles.cardName} numberOfLines={1}>
        {user.name}
      </Text>

      {hasBigThree ? (
        <View style={styles.bigThreeRow}>
          <BigThreeItem code={user.sun} />
          <BigThreeItem code={user.moon} />
          <BigThreeItem code={user.rising} />
        </View>
      ) : null}

      {(user.instagram || user.facebook) && (
        <View style={styles.socialRow}>
          {user.instagram ? (
            <SocialPill
              icon="logo-instagram"
              label="Insta"
              url={toUrl('https://instagram.com/', user.instagram)}
            />
          ) : null}
          {user.facebook ? (
            <SocialPill
              icon="logo-facebook"
              label="Fb"
              url={toUrl('https://facebook.com/', user.facebook)}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

export default function CommunityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getSimilarUsers();
        if (cancelled) return;
        const parsed = normalizeResponse(data);
        console.log(
          '[Community] groups:',
          parsed.length,
          parsed.map((g) => `${g.code}:${g.users.length}`).join(', '),
        );
        setGroups(parsed);
      } catch (e) {
        console.log('Community load failed:', (e as any)?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(() => groups, [groups]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('community.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
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

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#B283ED" />
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{t('community.empty')}</Text>
          </View>
        ) : (
          sections.map((group) => {
            const sign = ZODIAC_BY_CODE[group.code];
            return (
              <View key={group.code} style={styles.section}>
                <View style={styles.sectionHeader}>
                  {sign ? (
                    <Image source={sign.icon} style={styles.sectionGlyph} />
                  ) : null}
                  <Text style={styles.sectionTitle}>
                    {sign ? sign.label : group.code}
                  </Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  {t('community.sectionSubtitle')}
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardsRow}
                >
                  {group.users.map((user) => (
                    <UserCard key={`${group.code}-${user.id}`} user={user} />
                  ))}
                </ScrollView>
              </View>
            );
          })
        )}

        {/* Footer */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.footerLink}>{t('legalLinks.terms')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.footerLink}>{t('legalLinks.privacy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/subscription')}>
            <Text style={styles.footerLink}>{t('legalLinks.subscription')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const CARD_WIDTH = 150;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0F1014',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    backgroundColor: 'rgba(57, 60, 71, 0.4)',
    borderRadius: 999,
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },

  // Banner
  banner: {
    marginHorizontal: 20,
    height: 150,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    marginBottom: 28,
  },
  bannerImage: {
    borderRadius: 18,
    resizeMode: 'cover',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(10, 8, 26, 0.28)',
  },
  bannerContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
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
    fontFamily: 'SFProDisplay-Regular',
    maxWidth: '88%',
  },

  // State boxes
  stateBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    color: '#9C9CA6',
    fontSize: 14,
    fontFamily: 'SFProDisplay-Regular',
    textAlign: 'center',
    paddingHorizontal: 30,
  },

  // Sections
  section: {
    marginBottom: 26,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionGlyph: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: '#D3D5FB',
    marginRight: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'CooperLtBT-Bold',
  },
  sectionSubtitle: {
    color: '#9C9CA6',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'SFProDisplay-Regular',
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  // Cards
  cardsRow: {
    paddingHorizontal: 20,
    gap: 14,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(170, 154, 192, 0.35)',
  },
  cardName: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'CooperLtBT-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  bigThreeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  bigThreeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bigThreeIcon: {
    width: 12,
    height: 12,
    resizeMode: 'contain',
    tintColor: '#7C8CFF',
    marginRight: 3,
  },
  bigThreeLabel: {
    color: '#7C8CFF',
    fontSize: 9,
    fontFamily: 'SFProDisplay-Regular',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  socialPillText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'SFProDisplay-Regular',
  },

  // Footer
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 25,
    marginTop: 8,
  },
  footerLink: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'SFProDisplay-Regular',
    textDecorationLine: 'underline',
  },
});
