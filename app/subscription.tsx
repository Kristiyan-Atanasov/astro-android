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

const moonImg = require('../assets/images/moon-banner.png');

export default function SubscriptionScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.subtitle}>Let’s get started</Text>
          <TouchableOpacity onPress={() => router.back()}>
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
              colors={['rgba(212, 56, 226, 1)', 'rgba(44, 213, 255, 1)', 'rgba(36, 151, 253, 1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.discountBadge}
            >
              <Text style={styles.discountText}>38% off</Text>
            </LinearGradient>
          </View>

          <Text style={styles.trialText}>with 7 days free trial</Text>
          <Text style={styles.price}>$ 7.99</Text>
        </View>

        {/* Info */}
        <Text style={styles.secureText}>Secured with App Store. Cancel Anytime.</Text>

        {/* CTA Button */}
        <TouchableOpacity style={styles.ctaButton}>
          <LinearGradient
            colors={['rgba(87, 102, 255, 1)', 'rgba(178, 131, 237, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text style={styles.ctaText}>Start your 7-days free trial, then $7.99 / per month</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Note */}
        <Text style={styles.note}>
          Cancel anytime during your trial and you won’t be charged.
        </Text>

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.link}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.link}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/subscription')}>
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
    backgroundColor: '#141519',
    paddingTop: 60,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
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
    fontSize: 24,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 30,
  },
  moonImage: {
    width: width - 100,
    height: 180,
    alignSelf: 'center',
    marginBottom: 30,
  },
  subscriptionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(100,100,255,0.3)',
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLabel: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SFProDisplay-Regular',
  },
  discountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'SFProDisplay-Regular',
  },
  trialText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 6,
    fontFamily: 'SFProDisplay-Regular',
  },
  price: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'CooperLtBT-Bold',
    marginTop: 8,
  },
  secureText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#aaa',
    marginVertical: 12,
    fontFamily: 'SFProDisplay-Regular',
  },
  ctaButton: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gradient: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Nunito-Bold',
  },
  note: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'SFProDisplay-Regular',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  link: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'SFProDisplay-Regular',
  },
});
