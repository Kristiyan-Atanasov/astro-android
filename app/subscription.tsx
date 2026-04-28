import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const homeBg = require('../assets/images/home-bg.png');
const moonImg = require('../assets/images/moon-banner.png');

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Image source={homeBg} style={styles.bg} resizeMode="cover" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.subtitle}>Let’s get started</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>How your free trial{"\n"}works</Text>

        {/* Moon image */}
        <Image source={moonImg} style={styles.moonImage} resizeMode="contain" />

        {/* Subscription Card */}
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionRow}>
            <Text style={styles.planLabel}>Monthly Subscription</Text>

            <LinearGradient
              colors={['rgba(178, 131, 237, 1)', 'rgba(87, 124, 251, 1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.discountBadge}
            >
              <Text style={styles.discountText}>38% off</Text>
            </LinearGradient>
          </View>

          <Text style={styles.trialText}>with 7 days free trial</Text>
          <Text style={styles.price}>
            <Text style={styles.priceCurrency}>€ </Text>7.99
          </Text>
        </View>

        {/* Spacer pushes the CTA section toward the bottom on tall devices */}
        <View style={styles.spacer} />

        {/* Info */}
        <Text style={styles.secureText}>Secured with App Store. Cancel Anytime.</Text>

        {/* CTA Button */}
        <TouchableOpacity style={styles.ctaButton} activeOpacity={0.9}>
          <LinearGradient
            colors={['rgba(87, 124, 251, 1)', 'rgba(178, 131, 237, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text style={styles.ctaText} numberOfLines={2}>
              Start your 7-days free trial, then €7.99 / per month
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Note */}
        <Text style={styles.note}>
          Cancel anytime during your trial and you won’t be charged.
        </Text>

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/terms')}
          >
            <Text style={styles.link}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/privacy')}
          >
            <Text style={styles.link}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkHit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/subscription')}
          >
            <Text style={styles.link}>Subscription terms</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bg: {
    position: 'absolute',
    width,
    height: '100%',
    top: 0,
    left: 0,
    zIndex: -1,
  },
  scroll: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SFProDisplay-Regular',
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 34,
  },
  moonImage: {
    width: width - 140,
    height: 70,
    alignSelf: 'center',
    marginBottom: 28,
  },
  subscriptionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(140,140,200,0.18)',
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'CooperLtBT-Bold',
  },
  discountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
  },
  trialText: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 6,
    fontFamily: 'SFProDisplay-Regular',
  },
  price: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'CooperLtBT-Bold',
    marginTop: 10,
  },
  priceCurrency: {
    fontSize: 18,
    fontFamily: 'CooperLtBT-Bold',
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  secureText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#aaa',
    marginBottom: 12,
    fontFamily: 'SFProDisplay-Regular',
  },
  ctaButton: {
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 14,
  },
  gradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    fontFamily: 'Nunito-Bold',
    lineHeight: 20,
  },
  note: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 18,
    fontFamily: 'SFProDisplay-Regular',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  linkHit: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  link: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'SFProDisplay-Regular',
  },
});
