// app/edit-profile.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  clearAccessToken,
  deleteAccount,
  getUserProfile,
} from '../services/api';
import { clearOnboardingDraft } from '../services/onboardingDraft';
import { setBiometricEnabled } from '../services/biometric';

// Astrology profile changes are gated through human review. All change
// requests are emailed to this inbox via the user's mail client.
const SUPPORT_EMAIL = 'astro.insights.ltd@gmail.com';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatDate(iso: string | null, locale?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'bg' ? 'bg-BG' : undefined;

  const [loading, setLoading] = useState(true);
  // Lock used by sign-out / delete-account flows so destructive actions
  // can't be stacked while one is already running.
  const [accountWorking, setAccountWorking] = useState(false);

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [birthHour, setBirthHour] = useState<number>(0);
  const [birthMinute, setBirthMinute] = useState<number>(0);
  const [birthCity, setBirthCity] = useState('');

  // Contact-support modal state. Profile fields are read-only; any
  // change has to be requested via email to astro.insights.ltd@gmail.com.
  const [supportVisible, setSupportVisible] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile: any = await getUserProfile();
        if (cancelled || !profile) return;

        if (typeof profile.name === 'string') setName(profile.name);
        if (typeof profile.birth_date === 'string' && profile.birth_date.length > 0) {
          const d = new Date(profile.birth_date);
          if (!Number.isNaN(d.getTime())) setBirthDate(d);
        }
        if (typeof profile.birth_hour === 'number') setBirthHour(clamp(profile.birth_hour, 0, 23));
        if (typeof profile.birth_minute === 'number') setBirthMinute(clamp(profile.birth_minute, 0, 59));
        if (typeof profile.birth_city === 'string') setBirthCity(profile.birth_city);
        // Prefill the support form with whatever address the user
        // signed up with so most users can just type their request.
        if (typeof profile.email === 'string') setSupportEmail(profile.email);
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

  const openSupport = () => {
    setSupportVisible(true);
  };

  const closeSupport = () => {
    if (supportSubmitting) return;
    setSupportVisible(false);
  };

  const submitSupport = async () => {
    const email = supportEmail.trim();
    const message = supportMessage.trim();

    // Light validation – we don't try to be a full RFC 5322 validator,
    // just enough to catch obvious mistakes before launching the mail
    // client.
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert(t('editProfile.supportTitle'), t('editProfile.supportEmailRequired'));
      return;
    }
    if (!message) {
      Alert.alert(t('editProfile.supportTitle'), t('editProfile.supportMessageRequired'));
      return;
    }

    // Build a mailto URL that prefills subject, sender context and the
    // user's requested change. The user still presses "send" in their
    // mail client – that's the only reliable way to send mail from a
    // React Native app without a server.
    const subject = t('editProfile.supportSubject');
    const bodyLines = [
      `From: ${email}`,
      `Name: ${name || '—'}`,
      `Birthday: ${birthDate ? formatDate(birthDate.toISOString(), dateLocale) : '—'}`,
      `Birth city: ${birthCity || '—'}`,
      `Birth time: ${String(birthHour).padStart(2, '0')}:${String(birthMinute).padStart(2, '0')}`,
      '',
      'Requested change:',
      message,
    ];
    const url =
      `mailto:${SUPPORT_EMAIL}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(bodyLines.join('\n'))}`;

    try {
      setSupportSubmitting(true);
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert(
          t('editProfile.supportNoMailTitle'),
          t('editProfile.supportNoMailBody'),
        );
        return;
      }
      await Linking.openURL(url);
      setSupportVisible(false);
      setSupportMessage('');
      Alert.alert(
        t('editProfile.supportSuccessTitle'),
        t('editProfile.supportSuccessBody'),
      );
    } catch (e: any) {
      Alert.alert(
        t('editProfile.supportNoMailTitle'),
        e?.message ?? t('editProfile.supportNoMailBody'),
      );
    } finally {
      setSupportSubmitting(false);
    }
  };

  // Used by both sign-out and delete-account flows: forget local creds
  // and any cached onboarding state, then bounce back to the welcome
  // screen. Mirrors what the (removed) profile screen used to do.
  const cleanupAndGoHome = async () => {
    try {
      await clearAccessToken();
      await clearOnboardingDraft();
      await setBiometricEnabled(false);
    } catch (e) {
      console.log('Cleanup failed:', (e as any)?.message ?? String(e));
    } finally {
      router.replace('/');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t('profile.signOutConfirmTitle'),
      t('profile.signOutConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.signOut'),
          style: 'destructive',
          onPress: cleanupAndGoHome,
        },
      ],
      { cancelable: true },
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteConfirmTitle'),
      t('profile.deleteConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              setAccountWorking(true);
              await deleteAccount();
              await cleanupAndGoHome();
            } catch (e: any) {
              Alert.alert(
                t('profile.deleteFailedTitle'),
                e?.message ?? t('profile.deleteFailedBody'),
              );
            } finally {
              setAccountWorking(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
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
          <Text style={styles.headerTitle}>{t('editProfile.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Subtle banner explaining the screen is now read-only. */}
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed-outline" size={16} color="#C8B6F7" />
          <Text style={styles.lockedBannerText}>
            {t('editProfile.lockedHint')}
          </Text>
        </View>

        <Text style={styles.fieldLabel}>{t('editProfile.name')}</Text>
        <View style={[styles.field, styles.fieldLocked]}>
          <Text
            style={[
              styles.fieldValue,
              !name && styles.fieldValuePlaceholder,
            ]}
            numberOfLines={1}
          >
            {name || t('editProfile.namePlaceholder')}
          </Text>
          <Ionicons name="lock-closed-outline" size={16} color="#888" />
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>{t('editProfile.birthChart')}</Text>

        <Text style={styles.fieldLabel}>{t('editProfile.birthday')}</Text>
        <View style={[styles.field, styles.fieldLocked]}>
          <Text style={styles.fieldValue}>
            {birthDate
              ? formatDate(birthDate.toISOString(), dateLocale)
              : t('editProfile.birthdayPlaceholder')}
          </Text>
          <Ionicons name="lock-closed-outline" size={16} color="#888" />
        </View>

        <Text style={styles.fieldLabel}>{t('editProfile.birthCity')}</Text>
        <View style={[styles.field, styles.fieldLocked]}>
          <Text
            style={[
              styles.fieldValue,
              !birthCity && styles.fieldValuePlaceholder,
            ]}
            numberOfLines={1}
          >
            {birthCity || t('editProfile.birthCityPlaceholder')}
          </Text>
          <Ionicons name="lock-closed-outline" size={16} color="#888" />
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeColumn}>
            <Text style={styles.fieldLabel}>{t('editProfile.birthHour')}</Text>
            <View style={[styles.stepper, styles.fieldLocked]}>
              <Text style={styles.stepperValue}>
                {String(birthHour).padStart(2, '0')}
              </Text>
              <Ionicons name="lock-closed-outline" size={16} color="#888" />
            </View>
          </View>
          <View style={styles.timeColumn}>
            <Text style={styles.fieldLabel}>{t('editProfile.minute')}</Text>
            <View style={[styles.stepper, styles.fieldLocked]}>
              <Text style={styles.stepperValue}>
                {String(birthMinute).padStart(2, '0')}
              </Text>
              <Ionicons name="lock-closed-outline" size={16} color="#888" />
            </View>
          </View>
        </View>

        {/* Save → Contact support: requests are emailed instead of saved. */}
        <TouchableOpacity
          disabled={accountWorking}
          onPress={openSupport}
          style={styles.saveWrap}
        >
          <LinearGradient
            colors={['rgba(87, 102, 255, 1)', 'rgba(178, 131, 237, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.saveButton,
              accountWorking && styles.saveButtonDisabled,
            ]}
          >
            <Text style={styles.saveText}>
              {t('editProfile.contactSupport')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/*
          Sign-out / delete-account actions moved here from the removed
          dedicated profile screen so account management lives next to
          profile editing.
        */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.9}
          disabled={accountWorking}
          style={styles.signOutWrap}
        >
          <LinearGradient
            colors={['rgba(87, 124, 251, 1)', 'rgba(178, 131, 237, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.signOutButton, accountWorking && styles.disabled]}
          >
            <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteAccount}
          activeOpacity={0.8}
          disabled={accountWorking}
          style={[styles.deleteButton, accountWorking && styles.disabled]}
        >
          {accountWorking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteText}>{t('profile.deleteAccount')}</Text>
          )}
        </TouchableOpacity>

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

      {/* Contact-support modal: collects the user's email + message and
          launches the mail client with a prefilled email to support. */}
      <Modal
        visible={supportVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSupport}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('editProfile.supportTitle')}
              </Text>
              <TouchableOpacity
                onPress={closeSupport}
                disabled={supportSubmitting}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalIntro}>
              {t('editProfile.supportInstructions')}
            </Text>

            <Text style={styles.fieldLabel}>
              {t('editProfile.supportEmailLabel')}
            </Text>
            <TextInput
              style={styles.input}
              value={supportEmail}
              onChangeText={setSupportEmail}
              placeholder={t('editProfile.supportEmailPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!supportSubmitting}
            />

            <Text style={styles.fieldLabel}>
              {t('editProfile.supportMessageLabel')}
            </Text>
            <TextInput
              style={[styles.input, styles.messageInput]}
              value={supportMessage}
              onChangeText={setSupportMessage}
              placeholder={t('editProfile.supportMessagePlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              textAlignVertical="top"
              editable={!supportSubmitting}
            />

            <TouchableOpacity
              onPress={submitSupport}
              disabled={supportSubmitting}
              style={styles.saveWrap}
            >
              <LinearGradient
                colors={['rgba(87, 102, 255, 1)', 'rgba(178, 131, 237, 1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.saveButton,
                  supportSubmitting && styles.saveButtonDisabled,
                ]}
              >
                {supportSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>
                    {t('editProfile.supportSubmit')}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  // Visually distinguish read-only fields from editable ones.
  inputLocked: {
    color: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(57, 60, 71, 0.3)',
  },
  fieldLocked: {
    backgroundColor: 'rgba(57, 60, 71, 0.3)',
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(178, 131, 237, 0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
    gap: 10,
  },
  lockedBannerText: {
    flex: 1,
    color: '#D8CBF7',
    fontSize: 13,
    fontFamily: 'SFProDisplay-Regular',
    lineHeight: 18,
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
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SFProDisplay-Regular',
    marginRight: 12,
  },
  // Muted colour used when a locked field has no value yet (we still
  // render its placeholder text instead of leaving the row empty).
  fieldValuePlaceholder: {
    color: 'rgba(255,255,255,0.4)',
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
  signOutWrap: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: 14,
  },
  signOutButton: {
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  deleteButton: {
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'transparent',
    marginTop: 14,
  },
  deleteText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  disabled: {
    opacity: 0.6,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 9, 14, 0.78)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#1B1D24',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(178,131,237,0.18)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontFamily: 'CooperLtBT-Bold',
  },
  modalIntro: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'SFProDisplay-Regular',
    marginTop: 6,
    marginBottom: 14,
  },
  messageInput: {
    height: 120,
    paddingTop: 14,
    paddingBottom: 14,
  },
});
