// app/language.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { getUserProfile, patchUserProfile } from '../services/api';

type LanguageCode = 'ENGLISH' | 'BULGARIAN';

const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'ENGLISH', label: 'English' },
  { code: 'BULGARIAN', label: 'Bulgarian' },
];

function labelFor(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? 'English';
}

export default function LanguageScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>('ENGLISH');
  const [showPicker, setShowPicker] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile: any = await getUserProfile();
        if (cancelled || !profile) return;

        setProfileSnapshot(profile);
        const code = profile?.user_settings?.language;
        if (code === 'ENGLISH' || code === 'BULGARIAN') setLanguage(code);
      } catch (e) {
        console.log('Language load failed:', (e as any)?.message ?? String(e));
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
        user_settings: { ...baseSettings, language },
      });

      Alert.alert('Saved', 'Your language has been updated.');
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
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Language</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.fieldLabel}>Language</Text>
        <TouchableOpacity
          style={styles.field}
          onPress={() => setShowPicker((v) => !v)}
          disabled={saving}
        >
          <Text style={styles.fieldValue}>{labelFor(language)}</Text>
          <Ionicons name="chevron-expand" size={18} color="#aaa" />
        </TouchableOpacity>

        {showPicker && (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={language}
              onValueChange={(val) => setLanguage(val as LanguageCode)}
              itemStyle={styles.pickerItem}
            >
              {LANGUAGES.map((l) => (
                <Picker.Item key={l.code} label={l.label} value={l.code} />
              ))}
            </Picker>
          </View>
        )}

        <TouchableOpacity
          disabled={saving}
          onPress={handleSave}
          style={styles.saveWrap}
        >
          <LinearGradient
            colors={['rgba(87, 102, 255, 1)', 'rgba(178, 131, 237, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
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
  pickerContainer: {
    backgroundColor: 'rgba(57, 60, 71, 0.5)',
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  pickerItem: {
    color: '#fff',
    fontSize: 18,
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
