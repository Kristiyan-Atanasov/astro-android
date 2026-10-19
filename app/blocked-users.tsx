import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from '../components/AppAlert';
import { getCommunityBlocks, unblockCommunityUser } from '../services/api';
import { markCommunityUserUnblocked } from '../services/communitySafety';

type BlockedRow = {
  user_id: number | string;
  name: string;
  blocked_at?: string;
};

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async (pageOrNext?: string) => {
    const appending = typeof pageOrNext === 'string';
    if (appending) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getCommunityBlocks(pageOrNext || 1);
      const incoming = (data.results || []) as BlockedRow[];
      setRows((current) => {
        const combined = appending ? [...current, ...incoming] : incoming;
        const seen = new Set<string>();
        return combined.filter((row) => {
          const key = String(row.user_id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
      setNext(data.next);
    } catch (e: any) {
      console.log('[Blocked] load failed:', e?.status ?? '', e?.code ?? '');
      setError(
        e?.code === 'NETWORK_ERROR' || e?.code === 'E_TIMEOUT'
          ? t('common.networkError')
          : t('blockedUsers.error'),
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const unblock = (row: BlockedRow) => {
    const name = row.name || t('community.memberFallback');
    Alert.alert(
      t('blockedUsers.unblockTitle', { name }),
      t('blockedUsers.unblockBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('blockedUsers.unblock'),
          onPress: async () => {
            setPendingId(String(row.user_id));
            try {
              await unblockCommunityUser(row.user_id);
              markCommunityUserUnblocked(row.user_id);
              setRows((current) =>
                current.filter((item) => String(item.user_id) !== String(row.user_id)),
              );
            } catch (e: any) {
              Alert.alert(
                t('blockedUsers.unblockFailedTitle'),
                e?.code === 'NETWORK_ERROR' || e?.code === 'E_TIMEOUT'
                  ? t('common.networkError')
                  : t('blockedUsers.unblockFailed'),
              );
            } finally {
              setPendingId(null);
            }
          },
        },
      ],
    );
  };

  const formatWhen = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(i18n.language === 'bg' ? 'bg-BG' : undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={t('community.back')}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('blockedUsers.title')}</Text>
        <View style={styles.back} />
      </View>
      <Text style={styles.intro}>{t('blockedUsers.intro')}</Text>
      {loading ? (
        <ActivityIndicator color="#B283ED" style={styles.loader} />
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity onPress={() => void load()} accessibilityRole="button">
            <Text style={styles.retry}>{t('common.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.user_id)}
          contentContainerStyle={rows.length === 0 ? styles.emptyWrap : styles.list}
          ListEmptyComponent={<Text style={styles.stateText}>{t('blockedUsers.empty')}</Text>}
          onEndReached={() => {
            if (next && !loadingMore) void load(next);
          }}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => {
            const when = formatWhen(item.blocked_at);
            const pending = pendingId === String(item.user_id);
            return (
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.name} numberOfLines={2}>
                    {item.name || t('community.memberFallback')}
                  </Text>
                  {when ? <Text style={styles.when}>{when}</Text> : null}
                </View>
                <TouchableOpacity
                  style={styles.unblock}
                  onPress={() => unblock(item)}
                  disabled={pending}
                  accessibilityRole="button"
                  accessibilityLabel={t('blockedUsers.unblock')}
                >
                  {pending ? (
                    <ActivityIndicator color="#D3D5FB" />
                  ) : (
                    <Text style={styles.unblockText}>{t('blockedUsers.unblock')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#B283ED" style={styles.loader} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0C0E16', paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
  },
  intro: {
    color: '#9C9CA6',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  list: { paddingBottom: 28, gap: 10 },
  emptyWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginBottom: 10,
  },
  copy: { flex: 1 },
  name: { color: '#fff', fontSize: 16, fontFamily: 'Nunito-Bold' },
  when: { color: '#9C9CA6', fontSize: 12, marginTop: 4 },
  unblock: {
    minWidth: 88,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(211,213,251,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  unblockText: { color: '#D3D5FB', fontSize: 13, fontFamily: 'Nunito-Bold' },
  state: { alignItems: 'center', padding: 24, gap: 12 },
  stateText: { color: '#9C9CA6', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retry: { color: '#B283ED', fontFamily: 'Nunito-Bold', fontSize: 15 },
  loader: { marginTop: 28 },
});
