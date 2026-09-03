// app/onboarding/location.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { mergeOnboardingDraft } from '../../services/onboardingDraft';
import OnboardingHeader from '../../components/OnboardingHeader';

const backgroundImg = require('../../assets/images/background.png');
const starsImg = require('../../assets/images/stars.png');

type CitySuggestion = {
  id: string;
  label: string; // what we display in the dropdown ("Sofia, ..., Bulgaria")
  cityName: string; // bare city name we send to the backend ("Sofia")
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  countryCode: string | null;
};

// Photon (OSM) geocoder. Free, no API key, accepts queries in any
// language and returns Latin/English names when called with `lang=en`.
// We restrict to OSM `place` features so we don't get streets / shops.
const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';

// Only consider these OSM place types as "cities" for the picker.
const ACCEPTED_PLACE_TYPES = new Set([
  'city',
  'town',
  'village',
  'hamlet',
  'municipality',
  'suburb',
  'borough',
]);

async function fetchCitySuggestions(
  query: string,
  signal: AbortSignal,
): Promise<CitySuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url =
    `${PHOTON_ENDPOINT}?q=${encodeURIComponent(trimmed)}` +
    `&lang=en&limit=8&osm_tag=place`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Photon HTTP ${res.status}`);

  const data = await res.json();
  const features = Array.isArray(data?.features) ? data.features : [];

  const seen = new Set<string>();
  const out: CitySuggestion[] = [];

  for (const f of features) {
    const props = f?.properties ?? {};
    const placeType = String(props.osm_value ?? '').toLowerCase();
    if (!ACCEPTED_PLACE_TYPES.has(placeType)) continue;

    const name: string | undefined = props.name;
    if (!name || typeof name !== 'string') continue;

    const country: string | undefined = props.country;
    const region: string | undefined = props.state || props.county;

    const labelParts = [name, region, country].filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    );
    const label = labelParts.join(', ');

    // De-dup on the visible label so we don't show the same city twice.
    if (seen.has(label)) continue;
    seen.add(label);

    // Photon returns coordinates as [lng, lat]
    const coords =
      Array.isArray(f?.geometry?.coordinates) && f.geometry.coordinates.length >= 2
        ? f.geometry.coordinates
        : null;
    const latitude = coords && typeof coords[1] === 'number' ? coords[1] : null;
    const longitude = coords && typeof coords[0] === 'number' ? coords[0] : null;

    const countryCode =
      typeof props.countrycode === 'string' ? props.countrycode.toUpperCase() : null;

    out.push({
      id: `${props.osm_type ?? 'X'}${props.osm_id ?? Math.random()}`,
      label,
      cityName: name,
      latitude,
      longitude,
      country: country ?? null,
      countryCode,
    });
  }

  return out;
}

export default function LocationScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  // What's shown in the input + dropdown ("Sofia, ..., Bulgaria") once a
  // suggestion is locked in. Reset to null whenever the user keeps typing.
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  // Bare city name we save to the onboarding draft + send to the backend.
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<CitySuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }
    // If a city is already locked in, don't keep re-searching while the
    // input is read-only and showing the selection.
    if (selectedCityName) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const results = await fetchCitySuggestions(trimmed, controller.signal);
        if (controller.signal.aborted) return;
        setSuggestions(results);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        console.log('city suggest failed:', e?.message ?? String(e));
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoadingSuggestions(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selectedCityName]);

  const handleSelectSuggestion = (item: CitySuggestion) => {
    // Show just the bare city name in the input — the long
    // "City, Region, Country" label is only useful for picking, not
    // afterwards.
    setQuery(item.cityName);
    setSelectedLabel(item.label);
    setSelectedCityName(item.cityName);
    setSelectedCity(item);
    setSuggestions([]);
  };

  const handleChangeText = (text: string) => {
    // Once a city is selected the input is read-only, so this only fires
    // before selection. Just mirror the typed text.
    setQuery(text);
  };

  const handleClearSelection = () => {
    setQuery('');
    setSelectedLabel(null);
    setSelectedCityName(null);
    setSelectedCity(null);
    setSuggestions([]);
  };

  const canSubmit = !!selectedCityName && !submitting;
  const cityLocked = !!selectedCityName;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={undefined}
    >
      <Image source={backgroundImg} style={styles.bg} resizeMode="cover" />
      <Image source={starsImg} style={styles.stars} resizeMode="cover" />

      <View style={styles.content}>
        <OnboardingHeader
          title={t('onboarding.location.title')}
          step={5}
          onBack={() => router.back()}
          disabled={submitting}
        />

        <Text style={styles.description}>{t('onboarding.location.description')}</Text>

        <View style={styles.inputWrapper}>
          <View style={styles.inputRow}>
            <TextInput
              value={query}
              onChangeText={handleChangeText}
              placeholder={t('onboarding.location.placeholder')}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              style={[
                styles.input,
                cityLocked && styles.inputLocked,
                cityLocked && styles.inputWithButton,
              ]}
              editable={!submitting && !cityLocked}
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="off"
              returnKeyType="search"
            />
            {cityLocked && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearSelection}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={submitting}
              >
                <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>

          {!cityLocked && (suggestions.length > 0 || loadingSuggestions) && (
            <View style={styles.suggestionsContainer}>
              {loadingSuggestions && suggestions.length === 0 ? (
                <View style={styles.suggestionLoading}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  style={styles.suggestionsList}
                  ItemSeparatorComponent={() => (
                    <View style={styles.suggestionSeparator} />
                  )}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <Text style={styles.suggestionLabel} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}

          {!cityLocked &&
            !loadingSuggestions &&
            suggestions.length === 0 &&
            query.trim().length >= 2 && (
              <Text style={styles.hint}>
                {t('onboarding.location.keepTyping')}
              </Text>
            )}

          {cityLocked && selectedLabel && selectedLabel !== selectedCityName && (
            <Text style={styles.hint}>{selectedLabel}</Text>
          )}
        </View>

        <Text style={styles.info}>{t('onboarding.location.info')}</Text>

        <TouchableOpacity
          disabled={!canSubmit}
          onPress={async () => {
            if (!selectedCityName) return;
            try {
              setSubmitting(true);
              await mergeOnboardingDraft({
                birth_city: selectedCityName,
                // Forward the geocoded coordinates so the backend doesn't
                // have to re-geocode the city itself (which can fail with
                // 502s when its upstream provider is rate-limited or down).
                birth_city_latitude: selectedCity?.latitude ?? null,
                birth_city_longitude: selectedCity?.longitude ?? null,
                birth_city_country: selectedCity?.country ?? null,
                birth_city_country_code: selectedCity?.countryCode ?? null,
              });
              router.push('/onboarding/socials');
            } catch (error: any) {
              console.log(
                '❌ Error saving birth city:',
                error?.message ?? String(error),
              );
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <LinearGradient
            colors={['rgba(178, 131, 237, 1)', 'rgba(87, 124, 251, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.nextButton, !canSubmit && styles.nextButtonDisabled]}
          >
            <Text style={styles.nextText}>
              {submitting ? t('common.saving') : t('common.next')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bg: {
    position: 'absolute',
    width,
    height,
    top: 0,
    left: 0,
    zIndex: -2,
  },
  stars: {
    position: 'absolute',
    width,
    height,
    top: 0,
    left: 0,
    zIndex: -1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  description: {
    textAlign: 'center',
    color: 'rgba(200, 200, 200, 1)',
    marginBottom: 30,
    fontSize: 16,
    fontFamily: 'SFProDisplay-Regular',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(212, 213, 251, 0.2)',
    paddingHorizontal: 25,
    color: '#fff',
    fontFamily: 'SFProDisplay-Regular',
    backgroundColor: 'rgba(57, 102, 255, 0.05)',
    fontSize: 20,
  },
  inputWithButton: {
    paddingRight: 50,
  },
  inputLocked: {
    backgroundColor: 'rgba(87, 124, 251, 0.18)',
    borderColor: 'rgba(178, 131, 237, 0.45)',
  },
  clearButton: {
    position: 'absolute',
    right: 18,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 213, 251, 0.2)',
    backgroundColor: 'rgba(20, 12, 40, 0.92)',
    maxHeight: 240,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 240,
  },
  suggestionLoading: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  suggestionLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'SFProDisplay-Regular',
  },
  suggestionSeparator: {
    height: 1,
    backgroundColor: 'rgba(212, 213, 251, 0.1)',
    marginHorizontal: 20,
  },
  hint: {
    marginTop: 10,
    color: 'rgba(200, 200, 200, 0.65)',
    fontSize: 12,
    fontFamily: 'SFProDisplay-Regular',
    textAlign: 'center',
  },
  info: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'SFProDisplay-Regular',
  },
  nextButton: {
    borderRadius: 30,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
});
