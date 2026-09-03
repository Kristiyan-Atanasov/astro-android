// app/onboarding/birthday.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import {
  mergeOnboardingDraft,
  getOnboardingDraft,
} from '../../services/onboardingDraft';
import OnboardingHeader from '../../components/OnboardingHeader';
import ScrollWheelPicker from '../../components/ScrollWheelPicker';

const backgroundImg = require('../../assets/images/background.png');
const starsImg = require('../../assets/images/stars.png');

const DEFAULT_BIRTH_DATE = new Date(2000, 0, 1);
const MIN_YEAR = 1920;

function formatBirthDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDraftBirthDate(value: unknown): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampDate(year: number, monthIndex: number, day: number): Date {
  const maxDay = daysInMonth(year, monthIndex);
  const safeDay = Math.min(day, maxDay);
  const next = new Date(year, monthIndex, safeDay);
  const today = new Date();
  return next > today ? today : next;
}

export default function BirthdayScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState(DEFAULT_BIRTH_DATE);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const draft = await getOnboardingDraft();
        const saved = parseDraftBirthDate(draft?.birth_date);
        if (!cancelled && saved) setDate(saved);
      } catch (e) {
        console.log(
          'Birthday draft read failed:',
          (e as Error)?.message ?? String(e),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxYear = new Date().getFullYear();

  const monthOptions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(
      i18n.language === 'bg' ? 'bg-BG' : 'en-US',
      { month: 'short' },
    );
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const label = formatter.format(new Date(2000, monthIndex, 1));
      return {
        value: String(monthIndex),
        label,
      };
    });
  }, [i18n.language]);

  const yearOptions = useMemo(
    () =>
      Array.from({ length: maxYear - MIN_YEAR + 1 }, (_, i) => {
        const year = String(maxYear - i);
        return { value: year, label: year };
      }),
    [maxYear],
  );

  const dayOptions = useMemo(() => {
    const count = daysInMonth(date.getFullYear(), date.getMonth());
    return Array.from({ length: count }, (_, i) => {
      const val = String(i + 1);
      return { value: val, label: val.padStart(2, '0') };
    });
  }, [date]);

  const setPart = (part: 'year' | 'month' | 'day', value: string) => {
    const year = part === 'year' ? Number(value) : date.getFullYear();
    const month = part === 'month' ? Number(value) : date.getMonth();
    const day = part === 'day' ? Number(value) : date.getDate();
    setDate(clampDate(year, month, day));
  };

  return (
    <View style={styles.container}>
      <Image source={backgroundImg} style={styles.bg} resizeMode="cover" />
      <Image source={starsImg} style={styles.stars} resizeMode="cover" />

      <View style={styles.content}>
        <OnboardingHeader
          title={t('onboarding.birthday.title')}
          step={3}
          onBack={() => router.back()}
          disabled={submitting}
        />

        <Text style={styles.description}>{t('onboarding.birthday.description')}</Text>

        <View style={styles.pickerWrapper}>
            <View style={styles.androidWheelCard}>
              <View style={styles.androidWheelRow}>
                <View style={styles.androidWheelCol}>
                  <Text style={styles.androidWheelLabel}>
                    {t('onboarding.birthday.monthLabel')}
                  </Text>
                  <ScrollWheelPicker
                    options={monthOptions}
                    selectedValue={String(date.getMonth())}
                    onChange={(v) => setPart('month', v)}
                    enabled={!submitting}
                  />
                </View>
                <View style={styles.androidWheelColNarrow}>
                  <Text style={styles.androidWheelLabel}>
                    {t('onboarding.birthday.dayLabel')}
                  </Text>
                  <ScrollWheelPicker
                    options={dayOptions}
                    selectedValue={String(date.getDate())}
                    onChange={(v) => setPart('day', v)}
                    enabled={!submitting}
                  />
                </View>
                <View style={styles.androidWheelCol}>
                  <Text style={styles.androidWheelLabel}>
                    {t('onboarding.birthday.yearLabel')}
                  </Text>
                  <ScrollWheelPicker
                    options={yearOptions}
                    selectedValue={String(date.getFullYear())}
                    onChange={(v) => setPart('year', v)}
                    enabled={!submitting}
                  />
                </View>
              </View>
            </View>
        </View>

        <Text style={styles.info}>{t('onboarding.birthday.info')}</Text>

        <TouchableOpacity
          disabled={submitting}
          onPress={async () => {
            try {
              setSubmitting(true);

              const formattedDate = formatBirthDateLocal(date);
              await mergeOnboardingDraft({ birth_date: formattedDate });

              router.push('/onboarding/time');
            } catch (error: any) {
              console.log(
                '❌ Error saving birth date:',
                error?.message ?? String(error),
              );
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <LinearGradient
            colors={['rgba(178, 131, 237, 1)', 'rgba(87, 124, 251, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.nextButton, submitting && styles.nextButtonDisabled]}
          >
            <Text style={styles.nextText}>
              {submitting ? t('common.saving') : t('common.next')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bg: {
    position: 'absolute',
    width,
    height,
    top: 0,
    left: 0,
    zIndex: -2,
  },
  stars: {
    position: 'absolute',
    width,
    height,
    top: 0,
    left: 0,
    zIndex: -1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  description: {
    textAlign: 'center',
    color: 'rgba(200, 200, 200, 1)',
    marginBottom: 30,
    fontSize: 16,
    fontFamily: 'SFProDisplay-Regular',
  },
  pickerWrapper: {
    marginBottom: 20,
  },
  androidWheelCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(57, 60, 71, 0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(211, 213, 251, 0.12)',
    paddingTop: 10,
    paddingBottom: 4,
  },
  androidWheelRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
  },
  androidWheelCol: {
    flex: 1.2,
  },
  androidWheelColNarrow: {
    flex: 0.9,
  },
  androidWheelLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'SFProDisplay-Regular',
  },
  info: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'SFProDisplay-Regular',
  },
  nextButton: {
    borderRadius: 30,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
});
