// app/notifications.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Alert } from '../components/AppAlert';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserProfile, patchUserProfile } from '../services/api';
import {
  ensureNotificationPermission,
  registerForPushNotifications,
} from '../services/notifications';

// Selectable reminder windows in 30-minute steps. Stored on the backend
// as "HH:MM" strings inside user_settings.reminder_time_start /
// reminder_time_end.
const TIME_STEP_MINUTES = 30;
const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const out: { value: string; label: string }[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += TIME_STEP_MINUTES) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    const v = `${hh}:${mm}`;
    out.push({ value: v, label: v });
  }
  return out;
})();

// The backend stores reminder times as DRF TimeField, which accepts
// HH:MM, HH:MM:SS and HH:MM:SS.sssZ. The picker only deals in HH:MM
// (30-minute steps), so we normalise on the way in (trim seconds off
// what the backend returns) and on the way out (pad to HH:MM:SS to
// match what the rest of the onboarding payload sends).
function isValidTimeString(s: unknown): s is string {
  return typeof s === 'string' && /^\d{2}:\d{2}(:\d{2}(\.\d+)?Z?)?$/.test(s);
}

function normalizeIncomingTime(s: string): string {
  // Keep only HH:MM regardless of whether the backend returned
  // HH:MM, HH:MM:SS or HH:MM:SS.sssZ.
  return s.slice(0, 5);
}

function toBackendTimeString(hhmm: string): string {
  // Pad the picker's HH:MM value to HH:MM:SS for the API payload.
  return `${hhmm}:00`;
}

function timeToMinutes(s: string): number {
  const [h, m] = s.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Allow the user to receive between 1 and 10 reminders per day.
  // "Once" / "Twice" read more naturally than "1 times" / "2 times",
  // so we special-case the first two values; everything from 3 onward
  // uses the templated "N times" label.
  const COUNT_OPTIONS: { value: number; label: string }[] = Array.from(
    { length: 10 },
    (_, i) => {
      const value = i + 1;
      let label: string;
      if (value === 1) label = t('notificationsSettings.counts.once');
      else if (value === 2) label = t('notificationsSettings.counts.twice');
      else label = t('notificationsSettings.counts.nTimes', { count: value });
      return { value, label };
    },
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [allowNotifications, setAllowNotifications] = useState(true);
  const [reminderCount, setReminderCount] = useState<number>(1);
  // Reminder window — when in the day the user is willing to receive
  // notifications. Stored as "HH:MM" so it round-trips through the
  // backend user_settings payload unchanged.
  const [reminderTimeStart, setReminderTimeStart] = useState<string>('09:00');
  const [reminderTimeEnd, setReminderTimeEnd] = useState<string>('21:00');

  const [profileSnapshot, setProfileSnapshot] = useState<any>(null);
  const [showCountPicker, setShowCountPicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile: any = await getUserProfile();
        if (cancelled) return;

        if (profile) {
          setProfileSnapshot(profile);
          const settings = profile?.user_settings ?? {};
          if (typeof settings.allow_notifications === 'boolean') {
            setAllowNotifications(settings.allow_notifications);
          }
          if (typeof settings.reminder_count === 'number') {
            const clamped = Math.max(
              1,
              Math.min(10, Math.round(settings.reminder_count)),
            );
            setReminderCount(clamped);
          }
          if (isValidTimeString(settings.reminder_time_start)) {
            setReminderTimeStart(normalizeIncomingTime(settings.reminder_time_start));
          }
          if (isValidTimeString(settings.reminder_time_end)) {
            setReminderTimeEnd(normalizeIncomingTime(settings.reminder_time_end));
          }
        }
      } catch (e) {
        console.log('Notifications load failed:', (e as any)?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    // Cheap validation: the picker is constrained to valid HH:MM values,
    // but the user can still pick end <= start, which we don't want to
    // send to the backend.
    if (timeToMinutes(reminderTimeEnd) <= timeToMinutes(reminderTimeStart)) {
      Alert.alert(
        t('notificationsSettings.updateFailed'),
        t('notificationsSettings.invalidRange'),
      );
      return;
    }

    try {
      setSaving(true);

      const baseSettings = profileSnapshot?.user_settings ?? {
        allow_notifications: true,
        language: 'ENGLISH',
        reminder_count: 1,
        reminder_time_start: '09:00:00',
        reminder_time_end: '21:00:00',
      };

      await patchUserProfile({
        user_settings: {
          ...baseSettings,
          allow_notifications: allowNotifications,
          reminder_count: reminderCount,
          reminder_time_start: toBackendTimeString(reminderTimeStart),
          reminder_time_end: toBackendTimeString(reminderTimeEnd),
        },
      });

      if (allowNotifications) {
        const perm = await ensureNotificationPermission();
        if (perm.granted) {
          await registerForPushNotifications();
        }
      }

      Alert.alert(t('common.save'), t('notificationsSettings.saved'));
      router.back();
    } catch (e: any) {
      Alert.alert(t('notificationsSettings.updateFailed'), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.wrapper, styles.center]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const countLabel =
    COUNT_OPTIONS.find((o) => o.value === reminderCount)?.label ??
    t('notificationsSettings.counts.once');

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('notificationsSettings.title')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ToggleRow
          label={t('notificationsSettings.notifications')}
          value={allowNotifications}
          onChange={setAllowNotifications}
          disabled={saving}
        />

        <Text style={styles.sectionTitle}>
          {t('notificationsSettings.receiveDaily')}
        </Text>

        <Text style={styles.fieldLabel}>
          {t('notificationsSettings.timeOfDay')}
        </Text>
        <View style={styles.timeRow}>
          <View style={styles.timeColumn}>
            <Text style={styles.timeColumnLabel}>
              {t('notificationsSettings.from')}
            </Text>
            <TouchableOpacity
              style={styles.field}
              onPress={() => {
                setShowStartPicker((v) => !v);
                setShowEndPicker(false);
                setShowCountPicker(false);
              }}
              disabled={saving}
            >
              <Text style={styles.fieldValue}>{reminderTimeStart}</Text>
              <Ionicons name="chevron-expand" size={18} color="#aaa" />
            </TouchableOpacity>
          </View>
          <View style={styles.timeColumn}>
            <Text style={styles.timeColumnLabel}>
              {t('notificationsSettings.to')}
            </Text>
            <TouchableOpacity
              style={styles.field}
              onPress={() => {
                setShowEndPicker((v) => !v);
                setShowStartPicker(false);
                setShowCountPicker(false);
              }}
              disabled={saving}
            >
              <Text style={styles.fieldValue}>{reminderTimeEnd}</Text>
              <Ionicons name="chevron-expand" size={18} color="#aaa" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.fieldLabel}>
          {t('notificationsSettings.perDay')}
        </Text>
        <TouchableOpacity
          style={styles.field}
          onPress={() => {
            setShowCountPicker((v) => !v);
            setShowStartPicker(false);
            setShowEndPicker(false);
          }}
          disabled={saving}
        >
          <Text style={styles.fieldValue}>{countLabel}</Text>
          <Ionicons name="chevron-expand" size={18} color="#aaa" />
        </TouchableOpacity>

        <View style={styles.spacer} />

        <TouchableOpacity
          disabled={saving}
          onPress={handleSave}
          style={styles.saveWrap}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#577CFB', '#B283ED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            <Text style={styles.saveText}>
              {saving ? t('common.saving') : t('common.save')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footerLinks}>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/terms')}
          >
            <Text style={styles.footerLink}>{t('legalLinks.terms')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/privacy')}
          >
            <Text style={styles.footerLink}>{t('legalLinks.privacy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/subscription')}
          >
            <Text style={styles.footerLink}>{t('legalLinks.subscription')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Android: native Picker expands into a huge white block. Use a dark modal list. */}
      <OptionSheet
        visible={showStartPicker}
        title={t('notificationsSettings.from')}
        options={TIME_OPTIONS}
        selectedValue={reminderTimeStart}
        onSelect={(v) => {
          setReminderTimeStart(String(v));
          setShowStartPicker(false);
        }}
        onClose={() => setShowStartPicker(false)}
      />
      <OptionSheet
        visible={showEndPicker}
        title={t('notificationsSettings.to')}
        options={TIME_OPTIONS}
        selectedValue={reminderTimeEnd}
        onSelect={(v) => {
          setReminderTimeEnd(String(v));
          setShowEndPicker(false);
        }}
        onClose={() => setShowEndPicker(false)}
      />
      <OptionSheet
        visible={showCountPicker}
        title={t('notificationsSettings.perDay')}
        options={COUNT_OPTIONS.map((o) => ({
          value: String(o.value),
          label: o.label,
        }))}
        selectedValue={String(reminderCount)}
        onSelect={(v) => {
          setReminderCount(Number(v));
          setShowCountPicker(false);
        }}
        onClose={() => setShowCountPicker(false)}
      />
    </View>
  );
}

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, value, onChange, disabled }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <Text style={[styles.toggleLabel, disabled && { opacity: 0.45 }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#577CFB' }}
        thumbColor="#fff"
      />
    </View>
  );
}

interface OptionSheetProps {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

function OptionSheet({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: OptionSheetProps) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            style={styles.sheetList}
            renderItem={({ item }) => {
              const selected = item.value === selectedValue;
              return (
                <TouchableOpacity
                  style={[styles.sheetRow, selected && styles.sheetRowSelected]}
                  onPress={() => onSelect(item.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.sheetRowText,
                      selected && styles.sheetRowTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color="#B283ED" />
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity style={styles.pickerDone} onPress={onClose}>
            <Text style={styles.pickerDoneText}>{t('notificationsSettings.done')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#141519',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 30,
    paddingTop: 60,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
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
    fontSize: 22,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
    textAlign: 'center',
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SFProDisplay-Regular',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'CooperLtBT-Bold',
    marginTop: 28,
    marginBottom: 18,
  },
  fieldLabel: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 8,
    marginTop: 6,
  },
  field: {
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(57, 60, 71, 0.5)',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  fieldValue: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SFProDisplay-Regular',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeColumn: {
    flex: 1,
  },
  timeColumnLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 6,
  },
  pickerDone: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  pickerDoneText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheetCard: {
    backgroundColor: '#1C1F2A',
    borderRadius: 16,
    maxHeight: '70%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'CooperLtBT-Bold',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },
  sheetList: {
    maxHeight: 360,
  },
  sheetRow: {
    minHeight: 48,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  sheetRowSelected: {
    backgroundColor: 'rgba(87, 124, 251, 0.18)',
  },
  sheetRowText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SFProDisplay-Regular',
  },
  sheetRowTextSelected: {
    color: '#D3D5FB',
    fontFamily: 'Nunito-Bold',
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  saveWrap: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 18,
  },
  saveButton: {
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  linkHit: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  footerLink: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'SFProDisplay-Regular',
    textDecorationLine: 'underline',
  },
});
