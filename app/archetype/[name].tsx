// app/archetype/[name].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ZODIAC_SIGNS } from '../../components/Astrowheel';
import { getArchetypeMeta, type ZodiacElement } from '../../components/archetypeMeta';
import { getUserQualities, updateUserQualityStatus } from '../../services/api';

type QualityStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

interface QualityItem {
  id: number;
  archetype: string;
  quality_learning_type: string;
  title: string;
  text: string;
  status: QualityStatus;
  is_completed: boolean;
  is_free_tier: boolean;
  activated_at?: string | null;
  can_activate: boolean;
  can_deactivate: boolean;
}

const TAB_TYPES = {
  mastering: 'LEARNING',
  managing: 'MASTERED',
} as const;

type TabKey = keyof typeof TAB_TYPES;

const ELEMENT_COLORS: Record<ZodiacElement, string[]> = {
  fire: ['#FF8A4A', '#F95B3A'],
  earth: ['#7BB07A', '#4A8A57'],
  air: ['#A0C8FF', '#6FA9FF'],
  water: ['#5DC4F2', '#3A7BC8'],
};

function findSign(code: string) {
  const upper = (code || '').toUpperCase();
  return ZODIAC_SIGNS.find((s) => s.code === upper) ?? null;
}

function titleCase(s: string) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export default function ArchetypeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { name } = useLocalSearchParams<{ name: string }>();
  const code = (typeof name === 'string' ? name : '').toUpperCase();
  const sign = findSign(code);
  const meta = getArchetypeMeta(code);
  const title = sign?.label ?? meta?.label ?? titleCase(code);

  const [allQualities, setAllQualities] = useState<QualityItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('mastering');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadQualities = useCallback(async () => {
    try {
      const list = await getUserQualities();
      if (!isMounted.current) return;
      if (Array.isArray(list)) {
        setAllQualities(list as QualityItem[]);
      } else {
        setAllQualities([]);
      }
    } catch (e) {
      console.log('qualities load error:', (e as any)?.message ?? String(e));
      if (isMounted.current) setAllQualities([]);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQualities();
  }, [loadQualities]);

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
    if (filtered.length === 0 && tab === 'mastering') return archetypeQualities;
    return filtered;
  }, [archetypeQualities, tab]);

  const completedCount = tabQualities.filter((q) => q.is_completed).length;
  const totalCount = tabQualities.length;
  const lessonsLabel = `${totalCount || archetypeQualities.length} lessons`;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const hasLockedAny = archetypeQualities.some((q) => q.status === 'LOCKED');

  const handleQualityPress = useCallback(
    async (quality: QualityItem) => {
      if (quality.status === 'LOCKED') {
        Alert.alert(
          'Premium quality',
          'This quality is part of the premium plan. Start your free trial to unlock it.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'See plan', onPress: () => router.push('/subscription') },
          ],
        );
        return;
      }
      if (updatingId !== null) return;

      const nextStatus: QualityStatus | null = quality.can_deactivate
        ? 'INACTIVE'
        : quality.can_activate
        ? 'ACTIVE'
        : null;
      if (!nextStatus) return;

      const previousStatus = quality.status;

      setUpdatingId(quality.id);
      setAllQualities((prev) => {
        if (!prev) return prev;
        return prev.map((q) =>
          q.id === quality.id
            ? {
                ...q,
                status: nextStatus,
                can_activate: nextStatus === 'INACTIVE',
                can_deactivate: nextStatus === 'ACTIVE',
              }
            : q,
        );
      });

      try {
        await updateUserQualityStatus(quality.id, nextStatus);
        loadQualities();
      } catch (e) {
        if (isMounted.current) {
          setAllQualities((prev) => {
            if (!prev) return prev;
            return prev.map((q) =>
              q.id === quality.id ? { ...q, status: previousStatus } : q,
            );
          });
        }
        Alert.alert(
          'Update failed',
          (e as any)?.message || 'We couldn’t update this quality. Please try again.',
        );
      } finally {
        if (isMounted.current) setUpdatingId(null);
      }
    },
    [loadQualities, router, updatingId],
  );

  const elementColors = meta ? ELEMENT_COLORS[meta.element] : ELEMENT_COLORS.fire;

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
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTitleRow}>
            {sign?.icon ? (
              <Image source={sign.icon} style={styles.headerIcon} />
            ) : null}
            <Text style={styles.headerTitle}>{title.toUpperCase()}</Text>
          </View>

          <View style={styles.metaCol}>
            {meta ? (
              <>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>RULER</Text>
                  <View style={styles.metaValueRow}>
                    <Text style={styles.metaValue}>{meta.ruler}</Text>
                    <Ionicons name="sunny" size={14} color="#F7CE45" style={styles.metaIcon} />
                  </View>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>ELEMENT</Text>
                  <View style={styles.metaValueRow}>
                    <Text style={styles.metaValue}>{meta.elementLabel}</Text>
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
                      size={14}
                      color={elementColors[0]}
                      style={styles.metaIcon}
                    />
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {meta ? (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{meta.description}</Text>
          </View>
        ) : null}

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Developing qualities</Text>
        </View>

        <View style={styles.lessonsRow}>
          <View style={styles.lessonsBadge}>
            <Ionicons name="bookmark" size={12} color="#D3D5FB" />
            <Text style={styles.lessonsBadgeText}>{lessonsLabel}</Text>
          </View>
          {hasLockedAny ? (
            <LinearGradient
              colors={['#577CFB', '#B283ED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.proPill}
            >
              <Text style={styles.proPillText}>PRO</Text>
            </LinearGradient>
          ) : null}
        </View>

        <Text style={styles.sectionSub}>
          Read the guidance below in order to explore and understand Leo’s
          unique qualities. Each one has a switch activated by swiping it left
          or right. When a lesson is ON it means you’re actively learning or
          practicing that trait. When a lesson is OFF it means you’ve mastered
          it and it’s part of you now. Feel free to explore them at your own
          pace, turning each one ‘on’ as you focus on it and ‘off’ once you
          feel you’ve integrated it into your life.
        </Text>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'mastering' && styles.tabActive]}
            onPress={() => setTab('mastering')}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, tab === 'mastering' && styles.tabTextActive]}>
              Mastering
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'managing' && styles.tabActive]}
            onPress={() => setTab('managing')}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, tab === 'managing' && styles.tabTextActive]}>
              Managing
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressBlock}>
          <ProgressRow label="Physical" percent={completionPercent} />
          <ProgressRow label="Emotional" percent={completionPercent} />
        </View>

        {loading ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : tabQualities.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>
              No qualities to show yet. Check back later.
            </Text>
          </View>
        ) : (
          <View style={styles.qualityList}>
            {tabQualities.map((q) => (
              <QualityRow
                key={q.id}
                quality={q}
                isUpdating={updatingId === q.id}
                onPress={handleQualityPress}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ProgressRow({ label, percent }: { label: string; percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.progressRow}>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.progressBarTrack}>
        <LinearGradient
          colors={['#577CFB', '#B283ED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressBarFill, { width: `${clamped}%` }]}
        />
      </View>
      <Text style={styles.progressPercent}>{clamped}% complete</Text>
    </View>
  );
}

function QualityRow({
  quality,
  isUpdating,
  onPress,
}: {
  quality: QualityItem;
  isUpdating: boolean;
  onPress: (q: QualityItem) => void;
}) {
  const isLocked = quality.status === 'LOCKED';
  const isActive = quality.status === 'ACTIVE';

  return (
    <TouchableOpacity
      style={styles.qualityRow}
      onPress={() => onPress(quality)}
      activeOpacity={0.85}
      disabled={isUpdating}
    >
      {isActive ? (
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
      )}

      <View style={styles.qualityTextCol}>
        <Text style={styles.qualityTitle}>{quality.title}</Text>
        {!!quality.text && (
          <Text style={styles.qualitySubtitle} numberOfLines={2}>
            {quality.text}
          </Text>
        )}
      </View>

      {isUpdating ? (
        <ActivityIndicator color="#D3D5FB" />
      ) : isLocked ? (
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
        <Ionicons name="chevron-forward" size={18} color="#9C9CA6" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#141519',
  },
  scroll: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backButton: {
    backgroundColor: 'rgba(57, 60, 71, 0.6)',
    borderRadius: 999,
    padding: 10,
    marginTop: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
    marginTop: 8,
  },
  headerIcon: {
    width: 28,
    height: 28,
    marginRight: 10,
    tintColor: '#F7CE45',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'CooperLtBT-Bold',
    letterSpacing: 1,
  },
  metaCol: {
    alignItems: 'flex-end',
  },
  metaItem: {
    alignItems: 'flex-end',
    marginBottom: 6,
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
    marginTop: 2,
  },
  metaValue: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
  },
  metaIcon: {
    marginLeft: 4,
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
    marginBottom: 18,
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
  qualityTextCol: {
    flex: 1,
  },
  qualityTitle: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
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
  },
  qualityProBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.5,
  },
});
