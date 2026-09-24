import React from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from '../components/AppAlert';
import { ZODIAC_SIGNS } from '../components/Astrowheel';
import {
  ELEMENT_BACKGROUNDS,
  getArchetypeMeta,
} from '../components/archetypeMeta';
import {
  socialProfileUrl,
  type SocialPlatform,
} from '../services/socialLinks';

const profileBg = require('../assets/images/profile-bg.jpg');

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

// The member arrives as JSON on the route because the directory response is
// the only place this data exists — there is no per-member endpoint to call.
function parseMember(value: unknown): CommunityMember | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export default function CommunityMemberScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ member?: string }>();
  const member = parseMember(params.member);

  const signLabel = (code: string) =>
    t(`archetypeMeta.${code}.label`, {
      defaultValue: ZODIAC_SIGNS.find((sign) => sign.code === code)?.label || code,
    });

  const openSocial = async (platform: SocialPlatform, handle: string) => {
    try {
      await Linking.openURL(socialProfileUrl(platform, handle));
    } catch (e) {
      console.log('[CommunityMember] social link failed:', (e as any)?.message ?? String(e));
      Alert.alert(t('community.linkErrorTitle'), t('community.linkError'));
    }
  };

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel={t('community.back')}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  if (!member) {
    return (
      <View style={styles.wrapper}>
        <Image source={profileBg} style={styles.bg} resizeMode="cover" />
        {header}
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>{t('community.error')}</Text>
        </View>
      </View>
    );
  }

  const displayName = member.name || t('community.memberFallback');
  const details = [
    member.sun_sign && ['sun', '☉', member.sun_sign],
    member.moon_sign && ['moon', '☽', member.moon_sign],
    member.ascendant && ['ascendant', 'AC', member.ascendant],
  ].filter(Boolean) as string[][];
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
  const learning = member.learning_archetypes ?? [];

  return (
    <View style={styles.wrapper}>
      <Image source={profileBg} style={styles.bg} resizeMode="cover" />
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          {member.profile_picture_url ? (
            <Image
              source={{ uri: member.profile_picture_url }}
              style={styles.avatar}
              accessibilityLabel={t('community.avatarLabel', { name: displayName })}
            />
          ) : (
            <View
              style={[styles.avatar, styles.avatarPlaceholder]}
              accessibilityLabel={t('community.avatarPlaceholder', { name: displayName })}
            >
              <Ionicons name="person" size={44} color="#A9A9B4" />
            </View>
          )}
          <Text style={styles.name}>{displayName}</Text>
          {details.length > 0 ? (
            <View style={styles.signRow}>
              {details.map(([role, symbol, code]) => (
                <View
                  key={role}
                  style={styles.signItem}
                  accessibilityLabel={`${t(`community.${role}`)}: ${signLabel(code)}`}
                >
                  <Text style={styles.signSymbol}>{symbol}</Text>
                  <Text style={styles.signValue}>{signLabel(code)}</Text>
                </View>
              ))}
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
                  <FontAwesome5 name={social.icon} size={20} color="#EDEDF2" brand />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>{t('community.memberLearning')}</Text>
        {learning.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.learningRow}
          >
            {learning.map((code) => {
              const meta = getArchetypeMeta(code);
              const sign = ZODIAC_SIGNS.find((z) => z.code === code);
              return (
                <View key={code} style={styles.learningCard}>
                  <View style={styles.thumb}>
                    {meta ? (
                      <Image
                        source={ELEMENT_BACKGROUNDS[meta.element]}
                        style={styles.thumbImage}
                      />
                    ) : null}
                    {sign ? (
                      <Image source={sign.icon} style={styles.thumbGlyph} />
                    ) : null}
                  </View>
                  <Text style={styles.learningName} numberOfLines={1}>
                    {t('community.archetypeCard', { sign: signLabel(code) })}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.sectionEmpty}>{t('community.memberNoLearning')}</Text>
        )}
      </ScrollView>

      <View style={[styles.footerLinks, { paddingBottom: insets.bottom + 12 }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#000' },
  bg: {
    ...(StyleSheet.absoluteFill as object),
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  stateBox: { padding: 24, alignItems: 'center' },
  stateText: { color: '#92929D', fontSize: 14, textAlign: 'center' },
  profileCard: {
    alignItems: 'center',
    // Matches the profile screen's card tint so it stays readable on the photo.
    backgroundColor: 'rgba(57, 60, 71, 0.55)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 26,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  avatar: { width: 92, height: 92, borderRadius: 46 },
  avatarPlaceholder: {
    backgroundColor: '#292B33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'CooperLtBT-Bold',
    marginTop: 16,
    textAlign: 'center',
  },
  signRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: 12,
  },
  signItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  signSymbol: { color: '#B283ED', fontSize: 14 },
  signValue: { color: '#B283ED', fontSize: 14, fontFamily: 'Nunito-Bold' },
  socialRow: { flexDirection: 'row', gap: 16, marginTop: 20 },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'CooperLtBT-Bold',
    marginTop: 30,
  },
  sectionEmpty: { color: '#92929D', fontSize: 13, marginTop: 12 },
  learningRow: { flexDirection: 'row', gap: 12, paddingTop: 14, paddingBottom: 4 },
  learningCard: {
    width: 156,
    backgroundColor: 'rgba(57, 60, 71, 0.55)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
  },
  thumb: {
    height: 74,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1A1B22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  thumbGlyph: { width: 30, height: 30, resizeMode: 'contain' },
  learningName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    marginTop: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    paddingTop: 10,
  },
  footerLink: { color: '#5A5A66', fontSize: 12 },
});
