import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

type Section = { heading: string; body: string };

export default function PrivacyScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const title = t('legal.privacy.title');
  const sections = (t('legal.privacy.sections', { returnObjects: true }) ||
    []) as Section[];

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
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, index) => (
          <View key={index} style={{ marginBottom: 30 }}>
            <Text style={styles.sectionTitle}>{section.heading}</Text>
            <Text style={styles.paragraph}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={() => router.push('/terms')}>
          <Text style={styles.link}>{t('legalLinks.terms')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/privacy')}>
          <Text style={styles.link}>{t('legalLinks.privacy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/subscription')}>
          <Text style={styles.link}>{t('legalLinks.subscription')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#141519',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 35,
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Nunito-Bold',
  },
  content: {
    paddingHorizontal: 35,
    paddingBottom: 80,
    backgroundColor: '#141519',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
    color: '#fff',
    fontFamily: 'Nunito-Bold',
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 18,
    color: '#fff',
    letterSpacing: 0.2,
    fontFamily: 'SFProDisplay-Regular',
  },
  linksContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  link: {
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#ccc',
    textDecorationLine: 'underline',
    marginHorizontal: 5,
    fontFamily: 'SFProDisplay-Regular',
  },
  backButton: {
    backgroundColor: 'rgba(57, 60, 71, 0.4)',
    borderRadius: 999,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
