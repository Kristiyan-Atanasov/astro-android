import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter, type ErrorBoundaryProps } from 'expo-router';
import data from '../assets/data/insights.json';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{String(error?.message ?? error)}</Text>

      <TouchableOpacity style={styles.errorButton} onPress={retry}>
        <Text style={styles.errorButtonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

type LinkItem = {
  label: string;
  route: string;
};

export default function WelcomeScreen() {
  const router = useRouter();
  const { title, subtitle, button, links } = data.welcome as {
    title: string;
    subtitle: string;
    button: string;
    links: LinkItem[];
  };

  // Expo Router navigates via string paths like "/about" or "/signin". [page:1]
  const safePush = (route?: string) => {
    if (!route || typeof route !== 'string') return;
    const trimmed = route.trim();
    if (!trimmed.startsWith('/')) return;
    router.push(trimmed as any);
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/planet.png')}
        style={styles.planet}
        resizeMode="contain"
      />

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <TouchableOpacity style={styles.button} onPress={() => safePush('/signin')}>
        <Text style={styles.buttonText}>{button}</Text>
      </TouchableOpacity>

      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={() => safePush(links?.[0]?.route)}>
          <Text style={styles.link}>{links?.[0]?.label ?? ''}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => safePush(links?.[1]?.route)}>
          <Text style={styles.link}>{links?.[1]?.label ?? ''}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => safePush(links?.[2]?.route)}>
          <Text style={styles.link}>{links?.[2]?.label ?? ''}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  planet: {
    width: 350,
    height: 350,
    marginTop: 0
  },
  title: {
    fontSize: 35,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'CooperLtBT-Bold'
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#fff',
    marginBottom: 20,
    fontFamily: 'Nunito-Regular'
  },
  button: {
    backgroundColor: '#333',
    width: 328,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Nunito-Bold'
  },
  linksContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10
  },
  link: {
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#ccc',
    textDecorationLine: 'underline',
    marginHorizontal: 5,
    fontFamily: 'Nunito-Regular'
  },

  errorContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111'
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 12
  },
  errorMessage: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center'
  },
  errorButton: {
    backgroundColor: '#333',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 14
  }
});
