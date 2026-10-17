import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

type Props = {
  onAdjust: () => void;
  onDismiss: () => void;
};

export default function ReadingHintCard({ onAdjust, onDismiss }: Props) {
  const { t } = useTranslation();

  return (
    <LinearGradient
      colors={['#8E7CFF', '#577CFB', '#C7A6FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.frame}
    >
      <View style={styles.card}>
        <View style={styles.topRow}>
          <LinearGradient
            colors={['#577CFB', '#B283ED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mark}
          >
            <Text style={styles.markText}>Aa</Text>
          </LinearGradient>
          <View style={styles.copy}>
            <Text style={styles.kicker}>{t('reading.kicker')}</Text>
            <Text style={styles.title}>{t('reading.hintTitle')}</Text>
          </View>
        </View>
        <Text style={styles.body}>{t('reading.hintBody')}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.quietButton}
            accessibilityRole="button"
            accessibilityLabel={t('reading.hintDismiss')}
          >
            <Text style={styles.quietText}>{t('reading.hintDismiss')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAdjust}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={t('reading.hintAction')}
          >
            <LinearGradient
              colors={['#577CFB', '#B283ED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>{t('reading.hintAction')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 22,
    padding: 1,
    marginBottom: 22,
  },
  card: {
    borderRadius: 21,
    backgroundColor: 'rgba(16, 14, 28, 0.94)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'CooperLtBT-Bold',
  },
  copy: { flex: 1 },
  kicker: {
    color: '#C7B6FF',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'Nunito-Bold',
    marginBottom: 2,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 23,
    fontFamily: 'CooperLtBT-Bold',
  },
  body: {
    color: 'rgba(237, 232, 255, 0.82)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  quietButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quietText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  actionButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
});
