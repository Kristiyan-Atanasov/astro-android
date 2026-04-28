// app/edit-profile.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getUserProfile, postOnboarding } from '../services/api';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function EditProfileScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [birthHour, setBirthHour] = useState<number>(0);
  const [birthMinute, setBirthMinute] = useState<number>(0);
  const [birthCity, setBirthCity] = useState('');
  const [profileSnapshot, setProfileSnapshot] = useState<any>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile: any = await getUserProfile();
        if (cancelled || !profile) return;

        setProfileSnapshot(profile);

        if (typeof profile.name === 'string') setName(profile.name);
        if (typeof profile.birth_date === 'string' && profile.birth_date.length > 0) {
          const d = new Date(profile.birth_date);
          if (!Number.isNaN(d.getTime())) setBirthDate(d);
        }
        if (typeof profile.birth_hour === 'number') setBirthHour(clamp(profile.birth_hour, 0, 23));
        if (typeof profile.birth_minute === 'number') setBirthMinute(clamp(profile.birth_minute, 0, 59));
        if (typeof profile.birth_city === 'string') setBirthCity(profile.birth_city);
      } catch (e) {
        console.log('Edit profile load failed:', (e as any)?.message ?? String(e));
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

      const payload: Record<string, any> = {
        name: name.trim(),
        birth_date: birthDate ? birthDate.toISOString().split('T')[0] : null,
        birth_hour: birthHour,
        birth_minute: birthMinute,
        birth_city: birthCity.trim() || null,
        social_acc_instagram: profileSnapshot?.social_acc_instagram ?? '',
        social_acc_facebook: profileSnapshot?.social_acc_facebook ?? '',
        user_settings: profileSnapshot?.user_settings ?? {
          allow_notifications: true,
          language: 'ENGLISH',
          reminder_count: 1,
          reminder_time_start: '09:00',
          reminder_time_end: '21:00',
        },
      };

      await postOnboarding(payload);

      Alert.alert('Saved', 'Your profile has been updated.');
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

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={styles.scroll}
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
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="rgba(255,255,255,0.4)"
          editable={!saving}
        />

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Birth Chart</Text>

        <Text style={styles.fieldLabel}>Birthday</Text>
        <TouchableOpacity
          style={styles.field}
          onPress={() => setShowDatePicker(true)}
          disabled={saving}
        >
          <Text style={styles.fieldValue}>
            {birthDate ? formatDate(birthDate.toISOString()) : 'Select your birthday'}
          </Text>
          <Ionicons name="calendar-outline" size={18} color="#aaa" />
        </TouchableOpacity>
        {showDatePicker && (
          <View style={Platform.OS === 'ios' ? styles.iosPicker : undefined}>
            <DateTimePicker
              value={birthDate ?? new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              textColor="#fff"
              onChange={(event, selected) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (event.type === 'set' && selected) setBirthDate(selected);
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.iosPickerDone}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.iosPickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.fieldLabel}>Birth City</Text>
        <TextInput
          style={styles.input}
          value={birthCity}
          onChangeText={setBirthCity}
          placeholder="Enter your birth city"
          placeholderTextColor="rgba(255,255,255,0.4)"
          editable={!saving}
          autoCorrect={false}
        />

        <View style={styles.timeRow}>
          <View style={styles.timeColumn}>
            <Text style={styles.fieldLabel}>Birth Hour</Text>
            <Stepper
              value={birthHour}
              min={0}
              max={23}
              onChange={setBirthHour}
              disabled={saving}
            />
          </View>
          <View style={styles.timeColumn}>
            <Text style={styles.fieldLabel}>Minute</Text>
            <Stepper
              value={birthMinute}
              min={0}
              max={59}
              onChange={setBirthMinute}
              disabled={saving}
            />
          </View>
        </View>

        <TouchableOpacity
          disabled={saving || !name.trim()}
          onPress={handleSave}
          style={styles.saveWrap}
        >
          <LinearGradient
            colors={['rgba(87, 102, 255, 1)', 'rgba(178, 131, 237, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.saveButton,
              (saving || !name.trim()) && styles.saveButtonDisabled,
            ]}
          >
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/subscription')}>
            <Text style={styles.footerLink}>Subscription terms</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function Stepper({ value, min, max, onChange, disabled }: StepperProps) {
  const dec = () => onChange(clamp(value - 1, min, max));
  const inc = () => onChange(clamp(value + 1, min, max));
  const display = String(value).padStart(2, '0');
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperValue}>{display}</Text>
      <View style={styles.stepperButtons}>
        <TouchableOpacity onPress={inc} disabled={disabled} hitSlop={{ top: 6, bottom: 0, left: 6, right: 6 }}>
          <Ionicons name="chevron-up" size={16} color="#aaa" />
        </TouchableOpacity>
        <TouchableOpacity onPress={dec} disabled={disabled} hitSlop={{ top: 0, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="chevron-down" size={16} color="#aaa" />
        </TouchableOpacity>
      </View>
    </View>
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
    paddingBottom: 40,
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
  fieldLabel: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 8,
    marginTop: 6,
  },
  input: {
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(57, 60, 71, 0.5)',
    paddingHorizontal: 18,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
    marginBottom: 14,
  },
  field: {
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(57, 60, 71, 0.5)',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fieldValue: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SFProDisplay-Regular',
  },
  iosPicker: {
    backgroundColor: 'rgba(57, 60, 71, 0.5)',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  iosPickerDone: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  iosPickerDoneText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  timeColumn: {
    flex: 1,
  },
  stepper: {
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(57, 60, 71, 0.5)',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperValue: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'SFProDisplay-Regular',
  },
  stepperButtons: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveWrap: {
    marginTop: 16,
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
    marginTop: 24,
  },
  footerLink: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'SFProDisplay-Regular',
    textDecorationLine: 'underline',
  },
});
