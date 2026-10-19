import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert } from './AppAlert';
import { blockCommunityUser, reportCommunityUser } from '../services/api';
import { markCommunityUserBlocked } from '../services/communitySafety';

const REASONS = [
  'inappropriate_content',
  'harassment',
  'hate',
  'impersonation',
  'spam',
  'other',
] as const;

type Reason = (typeof REASONS)[number];
export type SafetyIntent = 'menu' | 'report-profile' | 'report-photo' | null;

type Props = {
  userId: string | number | null;
  name: string;
  hasPhoto: boolean;
  intent: SafetyIntent;
  onClose: () => void;
  onBlocked: () => void;
};

function safetyErrorCopy(
  error: any,
  t: (key: string, opts?: any) => string,
) {
  const status = Number(error?.status);
  if (status === 429) return t('communitySafety.reportLimit');
  if (status === 404) return t('communitySafety.unavailable');
  if (error?.code === 'NETWORK_ERROR' || error?.code === 'E_TIMEOUT') {
    return t('common.networkError');
  }
  return t('communitySafety.reportFailed');
}

export default function MemberSafetySheet({
  userId,
  name,
  hasPhoto,
  intent,
  onClose,
  onBlocked,
}: Props) {
  const { t } = useTranslation();
  const [view, setView] = useState<SafetyIntent>(intent);
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setView(intent);
    if (!intent) {
      setReason(null);
      setDetails('');
      setError(null);
      setBusy(false);
    }
  }, [intent, userId]);

  const close = () => {
    if (busy) return;
    onClose();
  };

  const finishBlock = () => {
    if (userId == null) return;
    markCommunityUserBlocked(userId);
    onBlocked();
    onClose();
  };

  const runBlock = async (afterReport = false) => {
    if (userId == null || busy) return;
    setBusy(true);
    setError(null);
    try {
      await blockCommunityUser(userId);
      finishBlock();
    } catch (e: any) {
      const status = Number(e?.status);
      const message =
        status === 404
          ? t('communitySafety.unavailable')
          : e?.code === 'NETWORK_ERROR' || e?.code === 'E_TIMEOUT'
            ? t('common.networkError')
            : afterReport
              ? t('communitySafety.blockFailedAfterReport')
              : t('communitySafety.blockFailed');
      if (afterReport) {
        Alert.alert(t('communitySafety.blockFailedTitle'), message);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmBlock = () => {
    Alert.alert(
      t('communitySafety.blockTitle', { name }),
      t('communitySafety.blockBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('communitySafety.block'), style: 'destructive', onPress: () => void runBlock() },
      ],
    );
  };

  const submitReport = async () => {
    if (userId == null || busy) return;
    const contentType = view === 'report-photo' ? 'profile_photo' : 'profile';
    const trimmed = details.trim();
    if (!reason) {
      setError(t('communitySafety.reasonRequired'));
      return;
    }
    if (reason === 'other' && !trimmed) {
      setError(t('communitySafety.detailsRequired'));
      return;
    }
    if (contentType === 'profile_photo' && !hasPhoto) {
      setError(t('communitySafety.unavailable'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await reportCommunityUser(userId, {
        contentType,
        reason,
        details: trimmed,
      });
      onClose();
      Alert.alert(
        t('communitySafety.reportReceivedTitle'),
        t('communitySafety.reportReceivedBody'),
        [
          { text: t('common.notNow'), style: 'cancel' },
          {
            text: t('communitySafety.block'),
            style: 'destructive',
            onPress: () => void runBlock(true),
          },
        ],
      );
    } catch (e) {
      setError(safetyErrorCopy(e, t));
    } finally {
      setBusy(false);
    }
  };

  const reporting = view === 'report-profile' || view === 'report-photo';

  return (
    <Modal
      visible={intent != null}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.dismiss} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {reporting ? (
            <>
              <Text style={styles.title}>
                {view === 'report-photo'
                  ? t('communitySafety.reportPhoto')
                  : t('communitySafety.reportProfile')}
              </Text>
              <Text style={styles.body}>{t('communitySafety.reportHint', { name })}</Text>
              <ScrollView style={styles.reasons} keyboardShouldPersistTaps="handled">
                {REASONS.map((item) => {
                  const selected = reason === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.reason, selected && styles.reasonSelected]}
                      onPress={() => setReason(item)}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={selected ? '#B283ED' : '#9C9CA6'}
                      />
                      <Text style={styles.reasonText}>
                        {t(`communitySafety.reasons.${item}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TextInput
                  style={styles.details}
                  value={details}
                  onChangeText={setDetails}
                  placeholder={
                    reason === 'other'
                      ? t('communitySafety.detailsRequiredPlaceholder')
                      : t('communitySafety.detailsPlaceholder')
                  }
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  multiline
                  maxLength={2000}
                  textAlignVertical="top"
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </ScrollView>
              <TouchableOpacity
                style={styles.blockLink}
                onPress={confirmBlock}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.blockLinkText}>{t('communitySafety.blockInstead')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void submitReport()}
                disabled={busy}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={['#577CFB', '#B283ED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submit}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>{t('communitySafety.sendReport')}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>{name}</Text>
              <Text style={styles.body}>{t('communitySafety.menuHint')}</Text>
              <TouchableOpacity
                style={styles.action}
                onPress={() => {
                  setError(null);
                  setView('report-profile');
                }}
                accessibilityRole="button"
              >
                <Ionicons name="flag-outline" size={18} color="#D3D5FB" />
                <Text style={styles.actionText}>{t('communitySafety.reportProfile')}</Text>
              </TouchableOpacity>
              {hasPhoto ? (
                <TouchableOpacity
                  style={styles.action}
                  onPress={() => {
                    setError(null);
                    setView('report-photo');
                  }}
                  accessibilityRole="button"
                >
                  <Ionicons name="image-outline" size={18} color="#D3D5FB" />
                  <Text style={styles.actionText}>{t('communitySafety.reportPhoto')}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.action}
                onPress={confirmBlock}
                disabled={busy}
                accessibilityRole="button"
              >
                <Ionicons name="ban-outline" size={18} color="#E85D5D" />
                <Text style={[styles.actionText, styles.blockText]}>
                  {t('communitySafety.block')}
                </Text>
              </TouchableOpacity>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </>
          )}
          <TouchableOpacity onPress={close} style={styles.cancel} accessibilityRole="button">
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function MemberSafetyButton({
  onPress,
  label,
}: {
  onPress: () => void;
  label: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.trigger}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name="ellipsis-horizontal" size={18} color="#D3D5FB" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: '#171923',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '86%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 14,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    marginBottom: 6,
  },
  body: {
    color: '#9C9CA6',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  blockText: { color: '#E85D5D' },
  reasons: { maxHeight: 360 },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  reasonSelected: { backgroundColor: 'rgba(178,131,237,0.14)' },
  reasonText: { color: '#fff', fontSize: 15, flex: 1 },
  details: {
    minHeight: 88,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: '#fff',
    padding: 12,
    fontSize: 15,
  },
  error: { color: '#E85D5D', fontSize: 13, lineHeight: 18, marginTop: 10 },
  blockLink: { alignSelf: 'flex-start', paddingVertical: 8 },
  blockLinkText: { color: '#E85D5D', fontSize: 13, fontFamily: 'Nunito-Bold' },
  submit: {
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Nunito-Bold' },
  cancel: { alignItems: 'center', paddingTop: 14 },
  cancelText: { color: '#9C9CA6', fontSize: 15 },
  trigger: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
