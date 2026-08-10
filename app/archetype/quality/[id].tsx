// app/archetype/quality/[id].tsx
//
// Full-page reader for a single archetype quality. Reached by tapping a
// quality on the archetype detail screen. Shows the zodiac glyph, an
// element banner and the quality's heading + full text.
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { recordQualityShare } from '../../../services/api';
import { ZODIAC_SIGNS } from '../../../components/Astrowheel';
import {
  ELEMENT_BACKGROUNDS,
  getArchetypeMeta,
} from '../../../components/archetypeMeta';

function findSign(code: string) {
  const upper = (code || '').toUpperCase();
  return ZODIAC_SIGNS.find((s) => s.code === upper) ?? null;
}

export default function QualityReaderScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    title?: string;
    text?: string;
  }>();

  const code = (typeof params.name === 'string' ? params.name : '').toUpperCase();
  const sign = findSign(code);
  const meta = getArchetypeMeta(code);
  const background = meta ? ELEMENT_BACKGROUNDS[meta.element] : null;

  const title = typeof params.title === 'string' ? params.title : '';
  const text = typeof params.text === 'string' ? params.text : '';
  const qualityId = Number(params.id);
  const paragraphs = text.split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);

  // Off-screen branded card that gets rendered to an image for sharing.
  const shareCardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async (platform: 'instagram' | 'facebook') => {
    if (sharing) return;
    setSharing(true);
    try {
      if (Number.isFinite(qualityId)) {
        recordQualityShare(qualityId, platform).catch((e) =>
          console.log('share notify failed:', (e as any)?.message ?? String(e)),
        );
      }

      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(t('quality.shareUnavailableTitle'), t('quality.shareUnavailableBody'));
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: title || t('quality.shareTitle'),
      });
    } catch (e) {
      console.log('share failed:', (e as any)?.message ?? String(e));
      Alert.alert(t('quality.shareUnavailableTitle'), t('quality.shareUnavailableBody'));
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>

          {sign?.icon ? (
            <Image source={sign.icon} style={styles.headerGlyph} />
          ) : (
            <View style={styles.headerGlyph} />
          )}

          <View style={styles.iconButtonPlaceholder}>
            <TouchableOpacity
              onPress={() => handleShare('instagram')}
              style={styles.iconButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              disabled={sharing}
            >
              <Ionicons name="share-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {background ? (
          <View style={styles.banner}>
            <Image source={background} style={styles.bannerImage} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.moonRow}>
          <View style={styles.moonDot} />
          <Ionicons name="moon" size={16} color="#AEB4E8" style={styles.moonFlip} />
          <Ionicons name="sparkles" size={14} color="#D3D5FB" />
          <Ionicons name="moon" size={16} color="#AEB4E8" />
          <View style={styles.moonDot} />
        </View>

        {!!title && <Text style={styles.title}>{title}</Text>}

        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => (
            <Text key={i} style={styles.body}>
              {p}
            </Text>
          ))
        ) : (
          <Text style={styles.body}>{text}</Text>
        )}

        {/* Share */}
        <Text style={styles.shareLabel}>{t('quality.shareTitle')}</Text>
        <View style={styles.shareRow}>
          <TouchableOpacity
            style={styles.shareButton}
            activeOpacity={0.85}
            onPress={() => handleShare('instagram')}
            disabled={sharing}
          >
            <LinearGradient
              colors={['#577CFB', '#B283ED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shareButtonInner}
            >
              <FontAwesome5 name="instagram" size={18} color="#fff" brand />
              <Text style={styles.shareButtonText}>Instagram</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            activeOpacity={0.85}
            onPress={() => handleShare('facebook')}
            disabled={sharing}
          >
            <View style={styles.shareButtonFb}>
              <FontAwesome5 name="facebook-f" size={18} color="#fff" brand />
              <Text style={styles.shareButtonText}>Facebook</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Off-screen branded card captured as the shared image. */}
      <View style={styles.shareCardHost} pointerEvents="none">
        <View ref={shareCardRef} collapsable={false} style={styles.shareCard}>
          {background ? (
            <Image source={background} style={styles.shareCardBg} resizeMode="cover" />
          ) : null}
          <View style={styles.shareCardOverlay} />
          <View style={styles.shareCardContent}>
            {sign?.icon ? (
              <Image source={sign.icon} style={styles.shareCardGlyph} />
            ) : null}
            {!!title && <Text style={styles.shareCardTitle}>{title}</Text>}
            <Text style={styles.shareCardBody}>{text}</Text>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.shareCardLogo}
            />
            <Text style={styles.shareCardBrand}>Astroinsights</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0F1014',
  },
  scroll: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(57, 60, 71, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGlyph: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
    tintColor: '#D3D5FB',
  },
  banner: {
    height: 150,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 22,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  moonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 26,
  },
  moonDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#AEB4E8',
  },
  moonFlip: {
    transform: [{ scaleX: -1 }],
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Nunito-Bold',
    marginBottom: 18,
  },
  body: {
    color: '#C9CBD6',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 18,
  },

  // Share controls
  shareLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
    marginTop: 14,
    marginBottom: 12,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
  },
  shareButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 26,
  },
  shareButtonFb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 26,
    backgroundColor: '#1877F2',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },

  // Off-screen card that becomes the shared image
  shareCardHost: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
  shareCard: {
    width: 360,
    backgroundColor: '#0F1014',
    paddingTop: 0,
    overflow: 'hidden',
  },
  shareCardBg: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  shareCardOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(10, 11, 18, 0.62)',
  },
  shareCardContent: {
    paddingHorizontal: 28,
    paddingVertical: 40,
    alignItems: 'center',
  },
  shareCardGlyph: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
    tintColor: '#D3D5FB',
    marginBottom: 20,
  },
  shareCardTitle: {
    color: '#fff',
    fontSize: 26,
    fontFamily: 'CooperLtBT-Bold',
    textAlign: 'center',
    marginBottom: 18,
  },
  shareCardBody: {
    color: '#E6E7EF',
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'SFProDisplay-Regular',
    textAlign: 'center',
    marginBottom: 28,
  },
  shareCardLogo: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  shareCardBrand: {
    color: '#AEB4E8',
    fontSize: 14,
    letterSpacing: 1.5,
    fontFamily: 'Nunito-Bold',
  },
});
