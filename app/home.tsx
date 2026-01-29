import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';

const homeBg = require('../assets/images/home-bg.png');
const vibeIcon = require('../assets/images/vibe-icon.png');
const menuIcon = require('../assets/images/burger.png');
const astroWheel = require('../assets/images/astro-wheel.png');
const upgradeBg = require('../assets/images/subscription-card.png');

// Icons
const icons = {
  home: require('../assets/icons/home.png'),
  community: require('../assets/icons/community.png'),
  profile: require('../assets/icons/profile.png'),
  edit: require('../assets/icons/edit.png'),
  notifications: require('../assets/icons/notification.png'),
  subscriptions: require('../assets/icons/crown.png'),
  language: require('../assets/icons/language.png'),
  privacy: require('../assets/icons/privacy.png'),
  terms: require('../assets/icons/terms.png'),
  faq: require('../assets/icons/faq.png'),
  logout: require('../assets/icons/logout.png'),
  arrow: require('../assets/icons/arrow-right.png'),
};

const symbols = [
  require('../assets/images/zodiac/aries.png'),
  require('../assets/images/zodiac/taurus.png'),
  require('../assets/images/zodiac/gemini.png'),
  require('../assets/images/zodiac/leo-active.png'),
  require('../assets/images/zodiac/virgo.png'),
  require('../assets/images/zodiac/libra.png'),
  require('../assets/images/zodiac/sagittarius.png'),
  require('../assets/images/zodiac/capricorn-active.png'),
  require('../assets/images/zodiac/aquarius-active.png'),
  require('../assets/images/zodiac/cancer.png'),
  require('../assets/images/zodiac/scorpio.png'),
  require('../assets/images/zodiac/pisces-active.png'),
];

export default function HomeScreen() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  return (
    <View style={styles.container}>
      <Image source={homeBg} style={styles.bg} resizeMode="cover" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Top Section */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.date}>WED, 13 AUGUST</Text>
            <Text style={styles.greeting}>Hello, Isabel!</Text>
          </View>
          <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
            <Image source={menuIcon} style={styles.menuIcon} />
          </TouchableOpacity>
        </View>

        {/* Daily Vibe */}
        <View style={styles.vibeCard}>
          <View style={styles.vibeHeader}>
            <Image source={vibeIcon} style={styles.vibeIcon} />
            <Text style={styles.vibeTitle}>Your daily vibe</Text>
          </View>
          <Text style={styles.vibeQuote}>
            “Real liberation comes not from glossing over or repressing painful states of feeling, but only from experiencing them to the full.”
          </Text>
        </View>

        {/* Astrowheel */}
        <Text style={styles.sectionTitle}>Your Astrowheel</Text>
        <Text style={styles.sectionSub}>
          Each person has 12 archetypes in their birth chart, but some are weak and others are well positioned.
        </Text>
        <Image source={astroWheel} style={styles.wheel} />

        {/* Zodiac Grid */}
        <Text style={styles.sectionTitle}>The keys to your chart</Text>
        <Text style={styles.sectionSub}>
          Each person has 12 archetypes in their birth chart, but some are weak and others are well positioned.
        </Text>
        <View style={styles.symbolGrid}>
          {symbols.map((icon, index) => (
            <View key={index} style={styles.symbolBox}>
              <Image source={icon} style={styles.symbolImage} />
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
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

      {/* Menu Drawer */}
      {menuVisible && (
        <>
          <Pressable style={styles.menuOverlay} onPress={closeMenu} />
          <Animated.View style={[styles.menuDrawer, { transform: [{ translateX: slideAnim }] }]}>
            <ScrollView contentContainerStyle={styles.menuContent} showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menu</Text>
                <TouchableOpacity onPress={closeMenu}>
                  <Text style={styles.menuClose}>×</Text>
                </TouchableOpacity>
              </View>

              {/* Subscription Banner */}
              <TouchableOpacity
                onPress={() => {
                  closeMenu();
                  router.push('/subscription');
                }}
                style={styles.subscriptionCard}
              >
                <Image source={upgradeBg} style={styles.subscriptionImage} resizeMode="cover" />
              </TouchableOpacity>

              {/* Menu Items */}
              {[
                { label: 'Home', icon: icons.home },
                { label: 'Community', icon: icons.community },
                { label: 'My profile', icon: icons.profile },
                { label: 'Edit Profile', icon: icons.edit },
                { label: 'Notifications', icon: icons.notifications },
                { label: 'Subscriptions', icon: icons.subscriptions },
                { label: 'Language', icon: icons.language },
                { label: 'Privacy policy', icon: icons.privacy, route: '/privacy' },
                { label: 'Terms of Service', icon: icons.terms, route: '/terms' },
                { label: 'FAQ', icon: icons.faq },
                { label: 'Log out', icon: icons.logout },
              ].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => {
                    if (item.route) {
                      closeMenu();
                      router.push(item.route);
                    }
                  }}
                >
                  <Image source={item.icon} style={styles.menuItemIcon} />
                  <Text style={styles.menuItemText}>{item.label}</Text>
                  <Image source={icons.arrow} style={styles.arrowIcon} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </>
      )}

    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    paddingBottom: 60,
  },
  topRow: {
    marginTop: 50,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuButton: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  date: {
    fontSize: 12,
    color: '#ccc',
    fontFamily: 'SFProDisplay-Regular',
  },
  greeting: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
  },
  vibeCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100,100,255,0.3)',
    padding: 16,
    marginBottom: 30,
  },
  vibeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vibeIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  vibeTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'CooperLtBT-Bold',
  },
  vibeQuote: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'SFProDisplay-Regular',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    color: '#aaa',
    fontFamily: 'SFProDisplay-Regular',
    marginBottom: 16,
  },
  wheel: {
    width: width - 48,
    height: width - 48,
    alignSelf: 'center',
    resizeMode: 'contain',
    marginBottom: 24,
  },
  symbolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  symbolBox: {
    width: (width - 96) / 3,
    height: (width - 96) / 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 40,
  },
  link: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'SFProDisplay-Regular',
  },

  // Drawer styles
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 5,
  },
  menuDrawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height: '100%',
    backgroundColor: '#141519',
    padding: 32,
    zIndex: 6,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 20,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
  },
  menuClose: {
    fontSize: 28,
    color: '#fff',
  },
  subscriptionCard: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  subscriptionImage: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  subscriptionBg: {
    position: 'absolute',
    width: '100%',
    height: 80,
  },
  subscriptionContent: {
    height: 80,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subscriptionText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SFProDisplay-Regular',
  },
  upgradeButton: {
    backgroundColor: '#8E8DFF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'SFProDisplay-Regular',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  menuItemIcon: {
    width: 28,
    height: 28,
    marginRight: 14,
  },
  menuItemText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SFProDisplay-Regular',
  },
  arrowIcon: {
    width: 24,
    height: 24,
  },
});
