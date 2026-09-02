import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

import type { ChartModel, ChartPlanet } from './ChartWheel';

const NATAL_BODIES = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const;

const POINT_IDS = ['northnode', 'southnode'] as const;

const ANGLE_IDS = ['ascendant', 'midheaven', 'descendant', 'imumcoeli'] as const;

const PLANET_ICONS: Record<string, ImageSourcePropType> = {
  sun: require('../assets/images/planets/sun.png'),
  moon: require('../assets/images/planets/moon.png'),
  mercury: require('../assets/images/planets/mercury.png'),
  venus: require('../assets/images/planets/venus.png'),
  mars: require('../assets/images/planets/mars.png'),
  jupiter: require('../assets/images/planets/jupiter.png'),
  saturn: require('../assets/images/planets/saturn.png'),
  uranus: require('../assets/images/planets/uranus.png'),
  neptune: require('../assets/images/planets/neptune.png'),
  pluto: require('../assets/images/planets/pluto.png'),
};

const SIGN_ABBREV: Record<string, string> = {
  ARIES: 'Ari',
  TAURUS: 'Tau',
  GEMINI: 'Gem',
  CANCER: 'Can',
  LEO: 'Leo',
  VIRGO: 'Vir',
  LIBRA: 'Lib',
  SCORPIO: 'Sco',
  SAGITTARIUS: 'Sag',
  CAPRICORN: 'Cap',
  AQUARIUS: 'Aqu',
  PISCES: 'Pis',
};

const ROMAN_HOUSES = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
];

const PLANET_NAME_KEYS: Record<string, string> = {
  sun: 'profilePage.planetSun',
  moon: 'profilePage.planetMoon',
  mercury: 'profilePage.planetMercury',
  venus: 'profilePage.planetVenus',
  mars: 'profilePage.planetMars',
  jupiter: 'profilePage.planetJupiter',
  saturn: 'profilePage.planetSaturn',
  uranus: 'profilePage.planetUranus',
  neptune: 'profilePage.planetNeptune',
  pluto: 'profilePage.planetPluto',
  northnode: 'profilePage.planetNorthNode',
  southnode: 'profilePage.planetSouthNode',
  ascendant: 'profilePage.planetAscendant',
  midheaven: 'profilePage.planetMidheaven',
  descendant: 'profilePage.planetDescendant',
  imumcoeli: 'profilePage.planetImumCoeli',
};

function pad2(value?: number) {
  return String(value ?? 0).padStart(2, '0');
}

function formatPosition(planet: ChartPlanet) {
  const deg = planet.normDegree ?? 0;
  const min = pad2(planet.arcMinutes);
  return `${deg}°${min}'`;
}

function signAbbrev(sign: string) {
  return SIGN_ABBREV[sign.toUpperCase()] ?? sign.slice(0, 3);
}

function natalPlanetsFromModel(model: ChartModel): ChartPlanet[] {
  const source =
    model.natalPlanets ??
    model.planets.filter((p) => p.mode !== 'transit');
  const byId = new Map(source.map((p) => [p.id, p]));

  const ordered: ChartPlanet[] = [];
  for (const id of NATAL_BODIES) {
    const planet = byId.get(id);
    if (planet) ordered.push(planet);
  }
  for (const id of POINT_IDS) {
    const planet = byId.get(id);
    if (planet) ordered.push(planet);
  }
  return ordered;
}

function anglesFromModel(model: ChartModel): ChartPlanet[] {
  const source =
    model.natalPlanets ??
    model.planets.filter((p) => p.mode !== 'transit');
  const byId = new Map(source.map((p) => [p.id, p]));
  return ANGLE_IDS.map((id) => byId.get(id)).filter(Boolean) as ChartPlanet[];
}

function PositionRow({
  planet,
  name,
}: {
  planet: ChartPlanet;
  name: string;
}) {
  const icon = PLANET_ICONS[planet.id];
  const houseRoman =
    planet.house != null ? ROMAN_HOUSES[planet.house - 1] : null;

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        {icon ? (
          <Image source={icon} style={styles.planetIcon} resizeMode="contain" />
        ) : (
          <View style={styles.pointBadge}>
            <Text style={styles.pointBadgeText}>{planet.label}</Text>
          </View>
        )}
        <Text style={styles.planetName} numberOfLines={1}>
          {name}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={styles.positionText} numberOfLines={1}>
          {formatPosition(planet)}
        </Text>
        <View style={styles.signPill}>
          <Text style={styles.signAbbrev}>{signAbbrev(planet.sign)}</Text>
        </View>
        {houseRoman ? (
          <View style={styles.houseBadge}>
            <Text style={styles.houseBadgeText}>{houseRoman}</Text>
          </View>
        ) : null}
        {planet.retrograde ? (
          <Text style={styles.retrograde}>r</Text>
        ) : (
          <View style={styles.retrogradeSpacer} />
        )}
      </View>
    </View>
  );
}

function AngleChip({
  planet,
  name,
  signLabel,
}: {
  planet: ChartPlanet;
  name: string;
  signLabel: string;
}) {
  return (
    <View style={styles.angleChip}>
      <Text style={styles.angleLabel}>{name}</Text>
      <Text style={styles.anglePosition}>{formatPosition(planet)}</Text>
      <Text style={styles.angleSign}>
        {signLabel} ({signAbbrev(planet.sign)})
      </Text>
    </View>
  );
}

export default function ChartPositionsList({ model }: { model: ChartModel }) {
  const { t } = useTranslation();

  const planets = useMemo(() => natalPlanetsFromModel(model), [model]);
  const angles = useMemo(() => anglesFromModel(model), [model]);

  if (!planets.length) return null;

  const signLabel = (sign: string) =>
    t(`archetypeMeta.${sign}.label`, { defaultValue: sign });

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['rgba(87, 124, 251, 0.14)', 'rgba(178, 131, 237, 0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.header}>
          <Text style={styles.headerStar}>✦</Text>
          <Text style={styles.headerTitle}>
            {t('profilePage.chartPositionsTitle')}
          </Text>
        </View>

        <View style={styles.columnHead}>
          <Text style={[styles.columnLabel, styles.columnLabelLeft]}>
            {t('profilePage.chartPositionsBody')}
          </Text>
          <Text style={styles.columnLabel}>
            {t('profilePage.chartPositionsPosition')}
          </Text>
        </View>

        <View style={styles.rows}>
          {planets.map((planet, index) => (
            <View key={planet.id}>
              {index > 0 ? <View style={styles.rowDivider} /> : null}
              <PositionRow
                planet={planet}
                name={t(PLANET_NAME_KEYS[planet.id] ?? planet.id)}
              />
            </View>
          ))}
        </View>

        {angles.length ? (
          <>
            <View style={styles.anglesDivider} />
            <Text style={styles.anglesTitle}>
              {t('profilePage.chartPositionsAngles')}
            </Text>
            <View style={styles.anglesGrid}>
              {angles.map((planet) => (
                <AngleChip
                  key={planet.id}
                  planet={planet}
                  name={t(PLANET_NAME_KEYS[planet.id] ?? planet.id)}
                  signLabel={signLabel(planet.sign)}
                />
              ))}
            </View>
          </>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingHorizontal: 4,
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(183, 131, 237, 0.22)',
    backgroundColor: 'rgba(57, 60, 71, 0.42)',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  headerStar: {
    color: '#B283ED',
    fontSize: 14,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.2,
  },
  columnHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    marginBottom: 2,
  },
  columnLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontFamily: 'SFProDisplay-Regular',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'right',
  },
  columnLabelLeft: {
    textAlign: 'left',
    flex: 1,
  },
  rows: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 6,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 0.95,
    minWidth: 0,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    flexShrink: 0,
  },
  planetIcon: {
    width: 20,
    height: 20,
    tintColor: 'rgba(255,255,255,0.95)',
  },
  pointBadge: {
    width: 26,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(87, 124, 251, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointBadgeText: {
    color: '#D3D5FB',
    fontSize: 11,
    fontFamily: 'Nunito-Bold',
  },
  planetName: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
    flexShrink: 1,
  },
  positionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontFamily: 'SFProDisplay-Regular',
    fontVariant: ['tabular-nums'],
  },
  signPill: {
    minWidth: 34,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(178, 131, 237, 0.18)',
    alignItems: 'center',
  },
  signAbbrev: {
    color: '#C9A4F5',
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
  },
  houseBadge: {
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(87, 124, 251, 0.4)',
    backgroundColor: 'rgba(87, 124, 251, 0.14)',
    alignItems: 'center',
  },
  houseBadgeText: {
    color: '#7B96F8',
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
  },
  retrograde: {
    color: '#E85D5D',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
    width: 11,
    textAlign: 'center',
  },
  retrogradeSpacer: {
    width: 11,
  },
  anglesDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(183, 131, 237, 0.25)',
    marginTop: 12,
    marginBottom: 10,
  },
  anglesTitle: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 11,
    fontFamily: 'SFProDisplay-Regular',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  anglesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  angleChip: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  angleLabel: {
    color: '#E4E6FF',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
    marginBottom: 3,
  },
  anglePosition: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    fontFamily: 'SFProDisplay-Regular',
  },
  angleSign: {
    color: 'rgba(201, 164, 245, 0.95)',
    fontSize: 12,
    fontFamily: 'SFProDisplay-Regular',
    marginTop: 2,
  },
});
