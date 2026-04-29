// app/notifications.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { getUserProfile, patchUserProfile } from '../services/api';
import {
  ensureNotificationPermission,
  registerForPushNotifications,
} from '../services/notifications';

type DayOfWeek = 'EVERYDAY' | 'WEEKDAYS' | 'WEEKENDS';

const DAY_OPTIONS: { code: DayOfWeek; label: string }[] = [
  { code: 'EVERYDAY', label: 'Everyday' },
  { code: 'WEEKDAYS', label: 'Weekdays' },
  { code: 'WEEKENDS', label: 'Weekends' },
];

const COUNT_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Once' },
  { value: 2, label: 'Twice' },
  { value: 3, label: 'Three times' },
];

const LOCAL_PREFS_KEY = 'notificationLocalPrefs';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [allowNotifications, setAllowNotifications] = useState(true);
  const [allowUpdates, setAllowUpdates] = useState(true);
  const [allowAffirmations, setAllowAffirmations] = useState(true);
  const [reminderCount, setReminderCount] = useState<number>(1);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('EVERYDAY');

  const [profileSnapshot, setProfileSnapshot] = useState<any>(null);
  const [showCountPicker, setShowCountPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);

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
            const clamped = Math.max(1, Math.min(3, settings.reminder_count));
            setReminderCount(clamped);
          }
        }

        try {
          const raw = await SecureStore.getItemAsync(LOCAL_PREFS_KEY);
          if (raw) {
            const local = JSON.parse(raw);
            if (typeof local.allow_updates === 'boolean') setAllowUpdates(local.allow_updates);
            if (typeof local.allow_affirmations === 'boolean') setAllowAffirmations(local.allow_affirmations);
            if (
              local.day_of_week === 'EVERYDAY' ||
              local.day_of_week === 'WEEKDAYS' ||
              local.day_of_week === 'WEEKENDS'
            ) {
              setDayOfWeek(local.day_of_week);
            }
          }
        } catch (e) {
          console.log('Notif local prefs read failed:', (e as any)?.message ?? String(e));
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
    try {
      setSaving(true);

      const baseSettings = profileSnapshot?.user_settings ?? {
        allow_notifications: true,
        language: 'ENGLISH',
        reminder_count: 1,
        reminder_time_start: '09:00',
        reminder_time_end: '21:00',
      };

      await patchUserProfile({
        user_settings: {
          ...baseSettings,
          allow_notifications: allowNotifications,
          reminder_count: reminderCount,
        },
      });

      try {
        await SecureStore.setItemAsync(
          LOCAL_PREFS_KEY,
          JSON.stringify({
            allow_updates: allowUpdates,
            allow_affirmations: allowAffirmations,
            day_of_week: dayOfWeek,
          }),
        );
      } catch (e) {
        console.log('Notif local prefs save failed:', (e as any)?.message ?? String(e));
      }

      if (allowNotifications) {
        const perm = await ensureNotificationPermission();
        if (perm.granted) {
          await registerForPushNotifications();
        }
      }

      Alert.alert('Saved', 'Your notification preferences have been updated.');
      router.back();
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? String(e));
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
    COUNT_OPTIONS.find((o) => o.value === reminderCount)?.label ?? 'Once';
  const dayLabel =
    DAY_OPTIONS.find((o) => o.code === dayOfWeek)?.label ?? 'Everyday';

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
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ToggleRow
          label="Notifications"
          value={allowNotifications}
          onChange={setAllowNotifications}
          disabled={saving}
        />
        <ToggleRow
          label="Updates"
          value={allowUpdates}
          onChange={setAllowUpdates}
          disabled={saving || !allowNotifications}
        />
        <ToggleRow
          label="Affirmations"
          value={allowAffirmations}
          onChange={setAllowAffirmations}
          disabled={saving || !allowNotifications}
        />

        <Text style={styles.sectionTitle}>Receive daily notifications</Text>

        <Text style={styles.fieldLabel}>Day of the week</Text>
        <TouchableOpacity
          style={styles.field}
          onPress={() => setShowDayPicker((v) => !v)}
          disabled={saving}
        >
          <Text style={styles.fieldValue}>{dayLabel}</Text>
          <Ionicons name="chevron-expand" size={18} color="#aaa" />
        </TouchableOpacity>
        {showDayPicker && (
          <PickerWrap>
            <Picker
              selectedValue={dayOfWeek}
              onValueChange={(v) => setDayOfWeek(v as DayOfWeek)}
              dropdownIconColor="#fff"
              itemStyle={styles.pickerItem}
            >
              {DAY_OPTIONS.map((o) => (
                <Picker.Item key={o.code} label={o.label} value={o.code} color="#fff" />
              ))}
            </Picker>
            {Platform.OS === 'ios' && (
              <DonePickerButton onPress={() => setShowDayPicker(false)} />
            )}
          </PickerWrap>
        )}

        <Text style={styles.fieldLabel}>How many per day</Text>
        <TouchableOpacity
          style={styles.field}
          onPress={() => setShowCountPicker((v) => !v)}
          disabled={saving}
        >
          <Text style={styles.fieldValue}>{countLabel}</Text>
          <Ionicons name="chevron-expand" size={18} color="#aaa" />
        </TouchableOpacity>
        {showCountPicker && (
          <PickerWrap>
            <Picker
              selectedValue={reminderCount}
              onValueChange={(v) => setReminderCount(Number(v))}
              dropdownIconColor="#fff"
              itemStyle={styles.pickerItem}
            >
              {COUNT_OPTIONS.map((o) => (
                <Picker.Item key={o.value} label={o.label} value={o.value} color="#fff" />
              ))}
            </Picker>
            {Platform.OS === 'ios' && (
              <DonePickerButton onPress={() => setShowCountPicker(false)} />
            )}
          </PickerWrap>
        )}

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
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footerLinks}>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/terms')}
          >
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/privacy')}
          >
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/subscription')}
          >
            <Text style={styles.footerLink}>Subscription terms</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
        ios_backgroundColor="rgba(255,255,255,0.15)"
      />
    </View>
  );
}

function PickerWrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.pickerWrap}>{children}</View>;
}

function DonePickerButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.pickerDone} onPress={onPress}>
      <Text style={styles.pickerDoneText}>Done</Text>
    </TouchableOpacity>
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
  pickerWrap: {
    backgroundColor: 'rgba(57, 60, 71, 0.5)',
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  pickerItem: {
    color: '#fff',
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
