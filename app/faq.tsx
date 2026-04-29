// app/faq.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const title = t('legal.faq.title');
  const items = (t('legal.faq.items', { returnObjects: true }) || []) as FaqItem[];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <View key={index} style={[styles.card, isOpen && styles.cardOpen]}>
              <TouchableOpacity
                onPress={() => toggle(index)}
                style={styles.cardHeader}
                activeOpacity={0.8}
              >
                <Text style={styles.question}>{item.question}</Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#aaa"
                />
              </TouchableOpacity>
              {isOpen && <Text style={styles.answer}>{item.answer}</Text>}
            </View>
          );
        })}
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#141519',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 30,
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
  content: {
    paddingHorizontal: 30,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 12,
  },
  cardOpen: {
    borderColor: 'rgba(87, 124, 251, 0.5)',
    backgroundColor: 'rgba(87, 102, 255, 0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  question: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SFProDisplay-Regular',
    paddingRight: 8,
  },
  answer: {
    color: '#cfcfcf',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'SFProDisplay-Regular',
    marginTop: 12,
  },
  footerLinks: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 25,
  },
  footerLink: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'SFProDisplay-Regular',
    textDecorationLine: 'underline',
  },
});
