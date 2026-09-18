// app/archetype/quality/[id].tsx
//
// Full-page reader for a single archetype quality. Reached by tapping a
// quality on the archetype detail screen. Shows the zodiac glyph, an
// element banner and the quality's heading + full text.
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { recordQualityShare } from '../../../services/api';
import { ZODIAC_SIGNS } from '../../../components/Astrowheel';
import {
  ELEMENT_BACKGROUNDS,
  getArchetypeMeta,
  pickAquariusReadingBackground,
  pickCapricornReadingBackground,
  pickLibraReadingBackground,
  pickPiscesReadingBackground,
  pickSagittariusReadingBackground,
  pickScorpioReadingBackground,
  pickVirgoReadingBackground,
  pickLeoReadingBackground,
  pickCancerReadingBackground,
  pickGeminiReadingBackground,
  pickTaurusReadingBackground,
  pickAriesReadingBackground,
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
  const background = useMemo(() => {
    if (code === 'PISCES') return pickPiscesReadingBackground();
    if (code === 'LIBRA') return pickLibraReadingBackground();
    if (code === 'AQUARIUS') return pickAquariusReadingBackground();
    if (code === 'CAPRICORN') return pickCapricornReadingBackground();
    if (code === 'SAGITTARIUS') return pickSagittariusReadingBackground();
    if (code === 'SCORPIO') return pickScorpioReadingBackground();
    if (code === 'VIRGO') return pickVirgoReadingBackground();
    if (code === 'LEO') return pickLeoReadingBackground();
    if (code === 'CANCER') return pickCancerReadingBackground();
    if (code === 'GEMINI') return pickGeminiReadingBackground();
    if (code === 'TAURUS') return pickTaurusReadingBackground();
    if (code === 'ARIES') return pickAriesReadingBackground();
    return meta ? ELEMENT_BACKGROUNDS[meta.element] : null;
  }, [code, meta]);

  // Decode the chosen asset before first paint of a new source when possible.
  useEffect(() => {
    if (!background) return;
    try {
      const resolved = Image.resolveAssetSource(background);
      if (resolved?.uri) Image.prefetch(resolved.uri);
    } catch {
      // best-effort
    }
  }, [background]);

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
      {background ? (
        <Image
          key={String(background)}
          source={background}
          style={styles.pageBackground}
          resizeMode="cover"
          fadeDuration={0}
        />
      ) : null}
      <View style={styles.pageOverlay} />

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

        <View style={styles.glassCard}>
          <BlurView
            intensity={20}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.glassCardTint} />

          <View style={styles.cardContent}>
            {sign?.icon ? (
              <Image source={sign.icon} style={styles.cardGlyph} />
            ) : null}

            {!!title && <Text style={styles.title}>{title}</Text>}

            <View style={styles.bodyGroup}>
              {paragraphs.length > 0 ? (
                paragraphs.map((p, i) => (
                  <Text key={i} style={styles.body}>
                    {p}
                  </Text>
                ))
              ) : (
                <Text style={styles.body}>{text}</Text>
              )}
            </View>

            <View style={styles.divider} />
            <Text style={styles.shareLabel}>{t('quality.shareTitle')}</Text>

            <View style={styles.shareRow}>
              <TouchableOpacity
                style={styles.shareButton}
                activeOpacity={0.75}
                onPress={() => handleShare('instagram')}
                disabled={sharing}
              >
                <FontAwesome5 name="instagram" size={19} color="#fff" brand />
                <Text style={styles.shareButtonText}>Instagram</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                activeOpacity={0.75}
                onPress={() => handleShare('facebook')}
                disabled={sharing}
              >
                <FontAwesome5 name="facebook-f" size={19} color="#fff" brand />
                <Text style={styles.shareButtonText}>Facebook</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  pageBackground: {
    ...(StyleSheet.absoluteFill as object),
    width: '100%',
    height: '100%',
  },
  pageOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(10, 7, 13, 0.36)',
  },
  scroll: {
    paddingHorizontal: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 76,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGlyph: {
    width: 1,
    height: 1,
    opacity: 0,
  },
  glassCard: {
    borderRadius: 42,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
  },
  glassCardTint: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(34, 22, 32, 0.13)',
  },
  cardContent: {
    paddingTop: 62,
    paddingHorizontal: 34,
    paddingBottom: 42,
    alignItems: 'center',
  },
  cardGlyph: {
    width: 58,
    height: 58,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
    opacity: 0.95,
    marginBottom: 28,
  },
  title: {
    color: '#fff',
    fontSize: 27,
    fontFamily: 'Nunito-Bold',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 18,
  },
  bodyGroup: {
    width: '100%',
    alignItems: 'center',
  },
  body: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'SFProDisplay-Regular',
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    width: 64,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    marginTop: 18,
    marginBottom: 24,
  },
  shareLabel: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    marginBottom: 20,
  },
  shareRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.72)',
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
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
