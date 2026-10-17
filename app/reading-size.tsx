import React, { useSyncExternalStore } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  READING_SIZES,
  chooseReadingSize,
  getReadingSize,
  subscribeReadingSize,
} from '../services/readingSize';

const SAMPLE_SIZE = {
  standard: 15,
  large: 22,
} as const;

export default function ReadingSizeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const selected = useSyncExternalStore(subscribeReadingSize, getReadingSize);

  const choose = (next: (typeof READING_SIZES)[number]) => {
    if (next === selected) return;
    void Haptics.selectionAsync().catch(() => {});
    void chooseReadingSize(next);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('reading.back')}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('reading.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <LinearGradient
        colors={['rgba(87,124,251,0.35)', 'rgba(178,131,237,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.preview}
      >
        <Text style={styles.previewKicker}>{t('reading.previewKicker')}</Text>
        <Text style={styles.previewTitle}>{t('reading.previewTitle')}</Text>
        <Text style={styles.previewBody}>{t('reading.previewBody')}</Text>
      </LinearGradient>

      <View style={styles.options}>
        {READING_SIZES.map((option) => {
          const active = option === selected;
          const body = (
            <View style={[styles.optionInner, active && styles.optionInnerActive]}>
              <Text style={[styles.sample, { fontSize: SAMPLE_SIZE[option] }]}>Aa</Text>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{t(`reading.sizes.${option}`)}</Text>
                <Text style={styles.optionDetail}>{t(`reading.details.${option}`)}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? <View style={styles.radioDot} /> : null}
              </View>
            </View>
          );

          return (
            <TouchableOpacity
              key={option}
              onPress={() => choose(option)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(`reading.sizes.${option}`)}
            >
              {active ? (
                <LinearGradient
                  colors={['#577CFB', '#B283ED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.optionFrame}
                >
                  {body}
                </LinearGradient>
              ) : (
                <View style={[styles.optionFrame, styles.optionFrameIdle]}>{body}</View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.note}>{t('reading.note')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 20,
    fontFamily: 'CooperLtBT-Bold',
  },
  headerSpacer: { width: 40 },
  preview: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(199,182,255,0.28)',
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 22,
  },
  previewKicker: {
    color: '#C7B6FF',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontFamily: 'Nunito-Bold',
  },
  previewTitle: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'CooperLtBT-Bold',
    marginTop: 8,
  },
  previewBody: {
    color: 'rgba(237,232,255,0.86)',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
  },
  options: { gap: 12 },
  optionFrame: {
    borderRadius: 20,
    padding: 1.5,
  },
  optionFrameIdle: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  optionInner: {
    minHeight: 78,
    borderRadius: 18.5,
    backgroundColor: 'rgba(18, 16, 30, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 14,
  },
  optionInnerActive: {
    backgroundColor: 'rgba(24, 18, 42, 0.98)',
  },
  sample: {
    width: 54,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
    textAlign: 'center',
  },
  optionCopy: { flex: 1 },
  optionTitle: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Nunito-Bold',
  },
  optionDetail: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#C7B6FF',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#B283ED',
  },
  note: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 12,
  },
});
