// app/archetype/[name].tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZODIAC_SIGNS } from '../../components/Astrowheel';

function findSign(code: string) {
  const upper = (code || '').toUpperCase();
  return ZODIAC_SIGNS.find((s) => s.code === upper) ?? null;
}

function titleCase(s: string) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export default function ArchetypeDetailScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const code = (typeof name === 'string' ? name : '').toUpperCase();
  const sign = findSign(code);
  const title = sign ? sign.label : titleCase(code);

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

      <View style={styles.body} />
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
  body: {
    flex: 1,
  },
});
