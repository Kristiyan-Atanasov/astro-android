// app/profile.tsx — personal profile with on-device birth chart & transits
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ChartWheel, { type ChartModel } from '../components/ChartWheel';
import ChartPositionsList from '../components/ChartPositionsList';
// ChartWheel renders assets/images/astro-wheel-chart.svg for natal + transit
import { ZODIAC_SIGNS, type ZodiacSign } from '../components/Astrowheel';
import { getUserProfile } from '../services/api';
import {
  buildTransitChartModel,
  computeBigThree,
  parseBirthInput,
} from '../services/localCharts';
import {
  clearProfilePhoto,
  pickAndSaveProfilePhoto,
  removeProfilePhoto,
} from '../services/profilePhoto';
const LOG = '[Profile]';

const ZODIAC_BY_CODE: Record<string, ZodiacSign> = ZODIAC_SIGNS.reduce(
  (acc, sign) => {
    acc[sign.code] = sign;
    return acc;
  },
  {} as Record<string, ZodiacSign>,
);

function parseLocalBirthDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatBirthDate(iso: string | null | undefined, locale?: string): string {
  if (!iso) return '';
  const d = parseLocalBirthDate(iso);
  if (!d) return '';
  return d.toLocaleDateString(locale, {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatBirthTime(hour: number | null | undefined, minute: number | null | undefined): string {
  if (typeof hour !== 'number' || typeof minute !== 'number') return '';
  const h12 = hour % 12 || 12;
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${String(h12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}

function formatTransitNow(locale?: string): { date: string; time: string } {
  const now = new Date();
  const date = now.toLocaleDateString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = now.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return { date, time };
}

function signLabel(code: string, t: (key: string, opts?: any) => string): string {
  if (!code || !ZODIAC_BY_CODE[code]) return '';
  const fromMeta = t(`archetypeMeta.${code}.label`, { defaultValue: '' });
  return fromMeta || ZODIAC_BY_CODE[code].label;
}

function BigThreeRow({
  sun,
  moon,
  rising,
  t,
}: {
  sun: string;
  moon: string;
  rising: string;
  t: (key: string, opts?: any) => string;
}) {
  const items = [
    { code: sun, role: 'sun', icon: '☉' },
    { code: moon, role: 'moon', icon: '☽' },
    { code: rising, role: 'rising', icon: 'AC' },
  ].filter((item) => item.code && ZODIAC_BY_CODE[item.code]);

  if (!items.length) return null;

  return (
    <View style={styles.bigThreeRow}>
      {items.map((item) => (
        <View key={item.role} style={styles.bigThreeItem}>
          <Text style={styles.bigThreeIcon}>{item.icon}</Text>
          <Text style={styles.bigThreeSign} numberOfLines={1}>
            {signLabel(item.code, t)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ChartPanel({
  loading,
  model,
  loadingText,
  emptyText,
  width,
}: {
  loading: boolean;
  model: ChartModel | null;
  loadingText: string;
  emptyText: string;
  width: number;
}) {
  const chartSize = Math.round(width - 24);

  if (loading) {
    return (
      <View style={[styles.chartPanel, styles.chartPanelTransit, { minHeight: chartSize }]}>
        <ActivityIndicator color="#B283ED" size="large" />
        <Text style={styles.chartHintText}>{loadingText}</Text>
      </View>
    );
  }

  if (model) {
    return (
      <View style={[styles.chartPanel, styles.chartPanelTransit]}>
        <ChartWheel model={model} size={chartSize} />
        <ChartPositionsList model={model} />
      </View>
    );
  }

  return (
    <View style={[styles.chartPanel, { minHeight: chartSize * 0.5 }]}>
      <Text style={styles.chartHintText}>{emptyText}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const dateLocale = i18n.language === 'bg' ? 'bg-BG' : undefined;

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const bigThree = useMemo(
    () => (profile ? computeBigThree(profile) : { sun: '', moon: '', rising: '' }),
    [profile],
  );

  const chartModel = useMemo(() => {
    if (!profile) return null;
    console.log(LOG, 'computing natal + transit chart (memo)…');
    return buildTransitChartModel(profile);
  }, [profile]);

  const birthLine = useMemo(() => {
    const datePart = formatBirthDate(profile?.birth_date, dateLocale);
    const timePart = formatBirthTime(profile?.birth_hour, profile?.birth_minute);
    if (datePart && timePart) return `${datePart} ${timePart}`;
    return datePart || timePart || '—';
  }, [profile, dateLocale]);

  const transitHeader = useMemo(() => {
    const { date, time } = formatTransitNow(dateLocale);
    const city =
      typeof profile?.birth_city === 'string' ? profile.birth_city.trim() : '';
    return { date, time, city };
  }, [profile, dateLocale]);

  useEffect(() => {
    // Clear leftover on-device avatar files from before backend storage.
    // Signed S3 URLs must come from the profile API, never SecureStore.
    void clearProfilePhoto();
  }, []);

  const explainPhotoResult = useCallback(
    (reason?: string) => {
      if (!reason || reason === 'cancelled') return;
      if (reason === 'permission') {
        Alert.alert(
          t('profilePage.photoPermissionTitle'),
          t('profilePage.photoPermissionBody'),
        );
        return;
      }
      if (reason === 'needs_rebuild') {
        Alert.alert(
          t('profilePage.photoRebuildTitle'),
          t('profilePage.photoRebuildBody'),
        );
        return;
      }
      if (reason === 'nsfw') {
        Alert.alert(
          t('profilePage.photoBlockedTitle'),
          t('profilePage.photoBlockedBody'),
        );
        return;
      }
      if (reason === 'too_large' || reason === 'bad_dimensions' || reason === 'invalid') {
        Alert.alert(
          t('profilePage.photoInvalidTitle'),
          t('profilePage.photoInvalidBody'),
        );
        return;
      }
      if (reason === 'check_failed') {
        Alert.alert(
          t('profilePage.photoCheckFailedTitle'),
          t('profilePage.photoCheckFailedBody'),
        );
        return;
      }
      Alert.alert(
        t('profilePage.photoFailedTitle'),
        t('profilePage.photoFailedBody'),
      );
    },
    [t],
  );

  const uploadPhoto = useCallback(async () => {
    setPhotoBusy(true);
    try {
      const result = await pickAndSaveProfilePhoto();
      if (result.ok) {
        if (result.profile) {
          setProfile((prev) => ({ ...(prev || {}), ...result.profile }));
        }
        setPhotoUri(
          typeof result.uri === 'string' && result.uri.trim()
            ? result.uri.trim()
            : result.profile?.profile_picture_url || null,
        );
        return;
      }
      explainPhotoResult(result.reason);
    } finally {
      setPhotoBusy(false);
    }
  }, [explainPhotoResult]);

  const deletePhoto = useCallback(async () => {
    setPhotoBusy(true);
    try {
      const result = await removeProfilePhoto();
      if (result.ok) {
        if (result.profile) {
          setProfile((prev) => ({
            ...(prev || {}),
            ...result.profile,
            profile_picture_url: result.profile.profile_picture_url ?? null,
          }));
        }
        setPhotoUri(null);
        return;
      }
      explainPhotoResult(result.reason);
    } finally {
      setPhotoBusy(false);
    }
  }, [explainPhotoResult]);

  const onAvatarPress = useCallback(() => {
    if (photoBusy) return;

    const buttons: Array<{
      text: string;
      style?: 'cancel' | 'destructive' | 'default';
      onPress?: () => void;
    }> = [
      {
        text: t('profilePage.photoUpload'),
        onPress: () => {
          void uploadPhoto();
        },
      },
    ];
    if (photoUri) {
      buttons.push({
        text: t('profilePage.photoRemove'),
        style: 'destructive',
        onPress: () => {
          void deletePhoto();
        },
      });
    }
    buttons.push({ text: t('profilePage.photoCancel'), style: 'cancel' });
    Alert.alert(t('profilePage.photoTitle'), t('profilePage.photoHint'), buttons);
  }, [deletePhoto, photoBusy, photoUri, t, uploadPhoto]);

  useEffect(() => {
    console.log(LOG, 'screen mount');
    let cancelled = false;

    (async () => {
      const started = Date.now();
      try {
        console.log(LOG, 'fetching user profile…');
        const data = await getUserProfile();
        if (cancelled) return;

        console.log(LOG, 'profile loaded', {
          ms: Date.now() - started,
          hasProfile: Boolean(data),
          name: data?.name,
          birth_date: data?.birth_date,
          birth_hour: data?.birth_hour,
          birth_minute: data?.birth_minute,
          birth_city: data?.birth_city,
          lat: data?.birth_city_latitude,
          lng: data?.birth_city_longitude,
          zodiac_sign: data?.zodiac_sign,
          moon_sign: data?.moon_sign,
          ascendant: data?.ascendant,
        });

        setProfile(data);

        if (!data) {
          console.log(LOG, 'no profile — user not signed in?');
          setChartError('no_profile');
          setPhotoUri(null);
          return;
        }

        const pictureUrl =
          typeof data.profile_picture_url === 'string' &&
          data.profile_picture_url.trim()
            ? data.profile_picture_url.trim()
            : null;
        setPhotoUri(pictureUrl);

        const birthInput = parseBirthInput(data);
        if (!birthInput) {
          console.log(LOG, 'birth data incomplete — charts unavailable');
          setChartError('missing_birth');
          return;
        }

        if (!buildTransitChartModel(data)) {
          console.log(LOG, 'natal chart model is null');
          setChartError('chart_failed');
        } else {
          console.log(LOG, 'profile ready for charts');
          setChartError(null);
        }
      } catch (e) {
        const msg = (e as Error)?.message ?? String(e);
        console.log(LOG, 'profile load error', msg);
        setChartError('chart_failed');
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
          console.log(LOG, 'initial load done', { totalMs: Date.now() - started });
        }
      }
    })();

    return () => {
      cancelled = true;
      console.log(LOG, 'screen unmount');
    };
  }, [i18n.language]);

  const chartLoading = loadingProfile;

  const chartEmptyText =
    chartError === 'missing_birth'
      ? t('profilePage.missingBirthData')
      : chartError === 'no_profile'
        ? t('profilePage.chartUnavailable')
        : t('profilePage.chartUnavailable');

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerSideButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profilePage.pageTitle')}</Text>
          <TouchableOpacity
            onPress={() => router.push('/edit-profile')}
            style={styles.headerSideButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('profilePage.accountSettings')}
          >
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {loadingProfile ? (
          <View style={styles.profileLoader}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <TouchableOpacity
                style={styles.avatarGlow}
                onPress={onAvatarPress}
                activeOpacity={0.85}
                disabled={photoBusy}
                accessibilityRole="button"
                accessibilityLabel={t('profilePage.photoTitle')}
              >
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={['#577CFB', '#B283ED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.avatar, styles.avatarPlaceholder]}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={26}
                      color="rgba(255,255,255,0.92)"
                    />
                  </LinearGradient>
                )}
                <View style={styles.avatarEditBadge}>
                  {photoBusy ? (
                    <ActivityIndicator size="small" color="#0A0E1A" />
                  ) : (
                    <Ionicons name="add" size={14} color="#0A0E1A" />
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.profileCardBody}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {profile?.name?.trim() || '—'}
                </Text>
                <Text style={styles.profileBirth}>{birthLine}</Text>
                <BigThreeRow
                  sun={bigThree.sun}
                  moon={bigThree.moon}
                  rising={bigThree.rising}
                  t={t}
                />
              </View>
            </View>

            <Text style={styles.dividerText}>•  ☽  ✦  ☾  •</Text>

            <View style={styles.chartSectionHeading}>
              <Text style={styles.chartSectionTitle}>
                {t('profilePage.natalChartAndTransits')}
              </Text>
              <Text style={styles.transitMetaText}>
                {[
                  transitHeader.date,
                  transitHeader.time,
                  transitHeader.city || null,
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </Text>
            </View>

            <ChartPanel
              loading={chartLoading}
              model={chartModel}
              loadingText={t('profilePage.chartLoading')}
              emptyText={chartEmptyText}
              width={width}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerSideButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 22,
    fontFamily: 'CooperLtBT-Bold',
  },
  profileLoader: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(57, 60, 71, 0.55)',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  avatarGlow: {
    borderRadius: 36,
    backgroundColor: '#577CFB',
    shadowColor: '#B283ED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8ECF8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1A1D27',
  },
  profileCardBody: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'CooperLtBT-Bold',
    marginBottom: 4,
  },
  profileBirth: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 10,
  },
  bigThreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bigThreeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bigThreeIcon: {
    color: '#D3D5FB',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  bigThreeSign: {
    color: '#B283ED',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
  },
  dividerText: {
    textAlign: 'center',
    color: '#577CFB',
    fontSize: 14,
    letterSpacing: 6,
    marginBottom: 14,
    opacity: 0.85,
    fontFamily: 'SFProDisplay-Regular',
  },
  chartSectionHeading: {
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  chartSectionTitle: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'CooperLtBT-Bold',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  transitMetaText: {
    color: 'rgba(211, 213, 251, 0.62)',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'SFProDisplay-Regular',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  chartPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    marginHorizontal: 0,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  chartPanelTransit: {
    marginHorizontal: 0,
  },
  chartHintText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontFamily: 'SFProDisplay-Regular',
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
});
