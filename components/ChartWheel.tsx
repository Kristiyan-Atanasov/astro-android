import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  Image,
  Text,
  ImageSourcePropType,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import ChartWheelSvg from '../assets/images/astro-wheel-chart.svg';

import { ZODIAC_SIGNS } from './Astrowheel';

export type ChartPlanet = {
  id: string;
  label: string;
  eclipticDeg: number;
  normDegree?: number;
  degreeLabel?: string;
  arcMinutes?: number;
  arcSeconds?: number;
  positionLabel?: string;
  sign: string;
  house?: number;
  retrograde?: boolean;
  mode?: 'natal' | 'transit';
};

export type ChartHouse = {
  index: number;
  eclipticDeg: number;
  sign: string;
};

export type ChartAspect = {
  from: string;
  to: string;
  type: string;
  color: string;
  opacity?: number;
  width?: number;
  cross?: boolean;
};

export type ChartModel = {
  kind: 'natal' | 'transit';
  ascendant: number;
  houses: ChartHouse[];
  planets: ChartPlanet[];
  aspects?: ChartAspect[];
  natalPlanets?: ChartPlanet[];
  transitPlanets?: ChartPlanet[];
};

type Props = {
  model: ChartModel;
  size: number;
};

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
];


const ZODIAC_BY_CODE = ZODIAC_SIGNS.reduce<Record<string, (typeof ZODIAC_SIGNS)[0]>>(
  (acc, sign) => {
    acc[sign.code] = sign;
    return acc;
  },
  {},
);

/** Geometry of astro-wheel-chart.svg (rings only, viewBox 393×456). */
const CHART_WHEEL_VB_W = 393;
const CHART_WHEEL_VB_H = 456;
const CHART_WHEEL_CX = CHART_WHEEL_VB_W / 2;
const CHART_WHEEL_CY = CHART_WHEEL_VB_H / 2;
const CHART_WHEEL_OUTER_R = 141.5;
const CHART_WHEEL_INNER_R = 96.9;

const TRANSIT_LABEL_COLORS: Record<string, string> = {
  sun: '#FFFFFF',
  moon: '#FFFFFF',
  mercury: '#8DD4F0',
  venus: '#8DD4F0',
  mars: '#FF4D4D',
  jupiter: '#5FD97A',
  saturn: '#5FD97A',
  uranus: '#5FD97A',
  neptune: '#8DD4F0',
  pluto: '#FF4D4D',
  ascendant: '#FFFFFF',
  descendant: '#FFFFFF',
  midheaven: '#FF4D4D',
  imumcoeli: '#FF4D4D',
  northnode: '#8DD4F0',
  southnode: '#8DD4F0',
};

const HARD_ASPECTS = new Set(['square', 'opposition']);

function normalizeDeg(deg: number) {
  return ((deg % 360) + 360) % 360;
}

/**
 * Screen angle for an ecliptic longitude.
 * Ascendant on the left, Midheaven toward the top (standard wheel).
 * Zodiac increases counterclockwise from Asc toward the IC.
 */
function chartAngleDeg(eclipticDeg: number, ascendant: number) {
  return normalizeDeg(180 - ascendant + eclipticDeg);
}

function polarFromChartAngle(
  cx: number,
  cy: number,
  radius: number,
  chartAngle: number,
) {
  const rad = (chartAngle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy - radius * Math.sin(rad),
  };
}

function polar(
  cx: number,
  cy: number,
  radius: number,
  eclipticDeg: number,
  ascendant: number,
) {
  return polarFromChartAngle(
    cx,
    cy,
    radius,
    chartAngleDeg(eclipticDeg, ascendant),
  );
}



function buildTransitAspectLines(
  aspects: ChartAspect[],
  planetMap: Map<string, ChartPlanet>,
  cx: number,
  cy: number,
  natalR: number,
  transitR: number,
  ascendant: number,
) {
  return aspects
    .filter((a) => a.cross)
    .map((aspect) => {
      const from = planetMap.get(aspect.from);
      const to = planetMap.get(aspect.to);
      if (!from || !to) return null;

      const fromR = from.mode === 'transit' ? transitR : natalR;
      const toR = to.mode === 'transit' ? transitR : natalR;
      const p1 = polar(cx, cy, fromR, from.eclipticDeg, ascendant);
      const p2 = polar(cx, cy, toR, to.eclipticDeg, ascendant);
      const isHard =
        HARD_ASPECTS.has(aspect.type) || aspect.color === '#E85D5D';

      return {
        key: `${aspect.from}-${aspect.to}-${aspect.type}`,
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        color: isHard ? '#FF3333' : 'rgba(255,255,255,0.25)',
        opacity: isHard ? 0.95 : 0.4,
        width: isHard ? 1.4 : 0.65,
      };
    })
    .filter(Boolean) as Array<{
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    opacity: number;
    width: number;
  }>;
}

// Birth chart palette — pure monochrome per Astro Wheel design
const BIRTH_COLORS = {
  bg: '#000000',
  line: 'rgba(255,255,255,0.98)',
  lineSpoke: 'rgba(255,255,255,0.55)',
  lineHouse: 'rgba(255,255,255,0.62)',
};

function wheelRadii(size: number, outerFill = 0.495) {
  const outerR = size * outerFill;
  const zodiacInnerR = outerR * (CHART_WHEEL_INNER_R / CHART_WHEEL_OUTER_R);
  const zodiacIconR = (outerR + zodiacInnerR) / 2;
  // Keep natal glyphs clearly inside the inner ring (not on the stroke)
  const planetR = zodiacInnerR * 0.55;
  const bandWidth = outerR - zodiacInnerR;
  const zodiacIconSize = bandWidth * 0.55;
  return { outerR, zodiacInnerR, zodiacIconR, planetR, zodiacIconSize };
}

/** Birth chart kept smaller than the transit canvas fill. */
const BIRTH_OUTER_FILL = 0.44;

function isAxisHouse(index: number) {
  return index === 1 || index === 4 || index === 7 || index === 10;
}

function useWheelGlow() {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1300,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glowAnim]);

  return glowAnim;
}

function buildZodiacSlots(
  cx: number,
  cy: number,
  zodiacIconR: number,
  ascendant: number,
) {
  return Array.from({ length: 12 }, (_, i) => ({
    icon: ZODIAC_SIGNS[i].icon,
    iconPos: polar(cx, cy, zodiacIconR, i * 30 + 15, ascendant),
    spokeDeg: i * 30,
  }));
}

/**
 * Home Astrowheel rings (cleaned copy): no outer dots, no center geometry.
 * Scaled so the SVG outer ring matches `outerR` and is centered on (cx, cy).
 * Not rotated — rings are circular; sector spokes are drawn in chart space.
 */
function ChartAstroRing({
  cx,
  cy,
  outerR,
}: {
  cx: number;
  cy: number;
  outerR: number;
}) {
  const scale = outerR / CHART_WHEEL_OUTER_R;
  const width = CHART_WHEEL_VB_W * scale;
  const height = CHART_WHEEL_VB_H * scale;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cx - CHART_WHEEL_CX * scale,
        top: cy - CHART_WHEEL_CY * scale,
        width,
        height,
      }}
    >
      <ChartWheelSvg width={width} height={height} />
    </View>
  );
}

function ChartWheelOverlay({
  svgSize,
  cx,
  cy,
  size,
  ascendant,
  houses,
  showHouseCusps = true,
  outerFill = 0.495,
}: {
  svgSize: number;
  cx: number;
  cy: number;
  size: number;
  ascendant: number;
  houses: ChartHouse[];
  showHouseCusps?: boolean;
  outerFill?: number;
}) {
  const { outerR, zodiacInnerR } = wheelRadii(size, outerFill);

  return (
    <>
      <ChartAstroRing cx={cx} cy={cy} outerR={outerR} />

      <Svg width={svgSize} height={svgSize} style={StyleSheet.absoluteFill}>
        {/* Sector dividers in the same angle space as the zodiac glyphs */}
        {Array.from({ length: 12 }, (_, i) => {
          const deg = i * 30;
          const inner = polar(cx, cy, zodiacInnerR, deg, ascendant);
          const outer = polar(cx, cy, outerR, deg, ascendant);
          return (
            <Line
              key={`spoke-${i}`}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={BIRTH_COLORS.lineSpoke}
              strokeWidth={0.9}
            />
          );
        })}

        {showHouseCusps &&
          houses.map((house) => {
            const axis = isAxisHouse(house.index);
            const inner = polar(
              cx,
              cy,
              zodiacInnerR * 0.05,
              house.eclipticDeg,
              ascendant,
            );
            const outer = polar(
              cx,
              cy,
              zodiacInnerR,
              house.eclipticDeg,
              ascendant,
            );
            return (
              <Line
                key={`house-cusp-${house.index}`}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={axis ? BIRTH_COLORS.line : BIRTH_COLORS.lineHouse}
                strokeWidth={axis ? 1 : 0.85}
              />
            );
          })}
      </Svg>
    </>
  );
}

function MonochromeZodiacGlyphs({
  cx,
  cy,
  size,
  ascendant,
  glowAnim,
  outerFill = 0.495,
}: {
  cx: number;
  cy: number;
  size: number;
  ascendant: number;
  glowAnim: Animated.Value;
  outerFill?: number;
}) {
  const { zodiacIconR, zodiacIconSize } = wheelRadii(size, outerFill);
  const zodiacSlots = buildZodiacSlots(cx, cy, zodiacIconR, ascendant);

  return (
    <>
      {zodiacSlots.map((slot, i) => (
        <View
          key={`zodiac-${i}`}
          style={{
            position: 'absolute',
            left: slot.iconPos.x - zodiacIconSize / 2,
            top: slot.iconPos.y - zodiacIconSize / 2,
            width: zodiacIconSize,
            height: zodiacIconSize,
          }}
        >
          <Animated.View
            style={[
              styles.birthZodiacGlowOuter,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 0.78],
                }),
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.02, 1.14],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image
              source={slot.icon}
              style={{
                width: zodiacIconSize,
                height: zodiacIconSize,
                tintColor: '#FFFFFF',
                opacity: 0.55,
              }}
              resizeMode="contain"
            />
          </Animated.View>

          <Image
            source={slot.icon}
            style={{
              width: zodiacIconSize,
              height: zodiacIconSize,
              tintColor: '#FFFFFF',
              opacity: 1,
            }}
            resizeMode="contain"
          />
        </View>
      ))}
    </>
  );
}

function renderInnerPlanetGlyph(
  planet: ChartPlanet,
  cx: number,
  cy: number,
  planetR: number,
  ascendant: number,
  size: number,
  allPlanets: ChartPlanet[],
  keyPrefix = 'glyph',
) {
  const icon = PLANET_ICONS[planet.id];
  if (!icon) return null;

  const planetGlyphSize = size * 0.056;
  const radius = resolveGlyphRadius(planet, planetR, allPlanets, size);
  const pos = polar(cx, cy, radius, planet.eclipticDeg, ascendant);
  const half = planetGlyphSize / 2;

  return (
    <View
      key={`${keyPrefix}-${planet.id}`}
      style={[
        styles.birthPlanetGlow,
        {
          left: pos.x - half - 2,
          top: pos.y - half - 2,
          width: planetGlyphSize + 4,
          height: planetGlyphSize + 4,
        },
      ]}
    >
      <Image
        source={icon}
        style={{
          width: planetGlyphSize,
          height: planetGlyphSize,
          tintColor: BIRTH_COLORS.line,
          opacity: 1,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

function resolveGlyphRadius(
  planet: ChartPlanet,
  baseRadius: number,
  allPlanets: ChartPlanet[],
  size: number,
) {
  const sorted = [...allPlanets].sort(
    (a, b) => a.eclipticDeg - b.eclipticDeg || a.id.localeCompare(b.id),
  );
  const index = sorted.findIndex((p) => p.id === planet.id);
  if (index < 0) return baseRadius;

  let radius = baseRadius;
  let stack = 0;
  for (let i = 0; i < index; i++) {
    const other = sorted[i];
    let diff = Math.abs(planet.eclipticDeg - other.eclipticDeg);
    if (diff > 180) diff = 360 - diff;
    if (diff < 12) stack += 1;
    else if (diff < 20) stack += 0.5;
  }
  radius += stack * size * 0.028;
  return radius;
}

/* ─── Birth Chart: Astro Wheel design (monochrome, planets inside) ─── */

function BirthChartWheel({
  model,
  size,
}: {
  model: ChartModel;
  size: number;
}) {
  const glowAnim = useWheelGlow();
  const cx = size / 2;
  const cy = size / 2;
  const { planetR } = wheelRadii(size, BIRTH_OUTER_FILL);
  const { ascendant, houses } = model;
  const natalPlanets = model.planets.filter((p) => NATAL_BODIES.includes(p.id));

  return (
    <View style={[styles.birthWrap, { width: size, height: size }]}>
      <ChartWheelOverlay
        svgSize={size}
        cx={cx}
        cy={cy}
        size={size}
        ascendant={ascendant}
        houses={houses}
        outerFill={BIRTH_OUTER_FILL}
      />
      <MonochromeZodiacGlyphs
        cx={cx}
        cy={cy}
        size={size}
        ascendant={ascendant}
        glowAnim={glowAnim}
        outerFill={BIRTH_OUTER_FILL}
      />
      {natalPlanets.map((planet) =>
        renderInnerPlanetGlyph(
          planet,
          cx,
          cy,
          planetR,
          ascendant,
          size,
          natalPlanets,
        ),
      )}
    </View>
  );
}

type TransitLabelLayout = {
  planet: ChartPlanet;
  isAngle: boolean;
  lineExtend: number;
  /** Offset in chart-angle degrees so nearby labels fan apart */
  angleNudge: number;
};

function transitLabelMetrics(size: number) {
  const iconSize = size * 0.056;
  const degreeSize = size * 0.046;
  const degreeWidth = size * 0.1;
  return { iconSize, degreeSize, degreeWidth };
}

/** Outer label band: clear the ring, then icon + degree just outside it. */
function transitLineStops(size: number) {
  const { iconSize, degreeSize } = transitLabelMetrics(size);
  const gap = size * 0.006;
  // Planet center sits far enough out that the glyph clears the ring edge.
  const planet = iconSize * 0.55 + size * 0.028;
  const degree = planet + iconSize * 0.72 + gap;
  const end = degree + degreeSize * 0.5;
  const tierStep = size * 0.032;
  return { planet, degree, end, tierStep };
}

function transitLabelChartAngle(
  layout: TransitLabelLayout,
  ascendant: number,
) {
  return (
    chartAngleDeg(layout.planet.eclipticDeg, ascendant) + layout.angleNudge
  );
}

type Rect = { left: number; top: number; right: number; bottom: number };

function rectsOverlap(a: Rect, b: Rect) {
  return !(
    a.right < b.left ||
    b.right < a.left ||
    a.bottom < b.top ||
    b.bottom < a.top
  );
}

function transitLabelRects(
  layout: TransitLabelLayout,
  cx: number,
  cy: number,
  outerR: number,
  ascendant: number,
  size: number,
): Rect[] {
  const { planet, isAngle, lineExtend } = layout;
  const { iconSize, degreeSize, degreeWidth } = transitLabelMetrics(size);
  const stops = transitLineStops(size);
  const chartAngle = transitLabelChartAngle(layout, ascendant);
  const pad = size * 0.01;

  const rects: Rect[] = [];

  if (!isAngle) {
    const planetPos = transitLinePoint(
      cx,
      cy,
      outerR,
      stops.planet,
      lineExtend,
      chartAngle,
    );
    rects.push({
      left: planetPos.x - iconSize / 2 - pad,
      top: planetPos.y - iconSize / 2 - pad,
      right: planetPos.x + iconSize / 2 + pad,
      bottom: planetPos.y + iconSize / 2 + pad,
    });

    const degreePos = transitLinePoint(
      cx,
      cy,
      outerR,
      stops.degree,
      lineExtend,
      chartAngle,
    );
    const retroPad = planet.retrograde ? degreeSize * 0.65 : 0;
    rects.push({
      left: degreePos.x - degreeWidth / 2 - retroPad - pad,
      top: degreePos.y - degreeSize * 0.55 - pad,
      right: degreePos.x + degreeWidth / 2 + retroPad + pad,
      bottom: degreePos.y + degreeSize * 0.55 + pad,
    });
  } else {
    const tagPos = transitLinePoint(
      cx,
      cy,
      outerR,
      stops.planet,
      lineExtend,
      chartAngle,
    );
    const tagW = size * 0.11;
    const tagH = size * 0.05;
    rects.push({
      left: tagPos.x - tagW / 2 - pad,
      top: tagPos.y - tagH / 2 - pad,
      right: tagPos.x + tagW / 2 + pad,
      bottom: tagPos.y + tagH / 2 + pad,
    });
  }

  return rects;
}

function transitLabelsCollide(
  a: TransitLabelLayout,
  b: TransitLabelLayout,
  cx: number,
  cy: number,
  outerR: number,
  ascendant: number,
  size: number,
) {
  const aRects = transitLabelRects(a, cx, cy, outerR, ascendant, size);
  const bRects = transitLabelRects(b, cx, cy, outerR, ascendant, size);
  for (const ra of aRects) {
    for (const rb of bRects) {
      if (rectsOverlap(ra, rb)) return true;
    }
  }
  return false;
}

function computeTransitOuterLayouts(
  items: Array<{ planet: ChartPlanet; isAngle?: boolean }>,
  ascendant: number,
  outerR: number,
  size: number,
): TransitLabelLayout[] {
  const { tierStep } = transitLineStops(size);
  const layoutCx = 1000;
  const layoutCy = 1000;

  const sorted = items
    .map(({ planet, isAngle }) => ({
      planet,
      isAngle: !!isAngle,
      chartAngle: chartAngleDeg(planet.eclipticDeg, ascendant),
    }))
    .sort((a, b) => a.chartAngle - b.chartAngle);

  const placed: TransitLabelLayout[] = [];
  // Spread around the ring first; only step outward when needed.
  const nudgeOrder = [0, 3.5, -3.5, 7, -7, 10.5, -10.5, 14, -14, 18, -18];
  const maxTier = 2;
  const maxExtend = tierStep * maxTier;

  for (const item of sorted) {
    let placedThis = false;
    const nudges = item.isAngle ? [0] : nudgeOrder;

    for (let tier = 0; tier <= maxTier && !placedThis; tier++) {
      const lineExtend = tier * tierStep;
      for (const angleNudge of nudges) {
        const candidate: TransitLabelLayout = {
          planet: item.planet,
          isAngle: item.isAngle,
          lineExtend,
          angleNudge,
        };

        const conflict = placed.some((p) =>
          transitLabelsCollide(
            candidate,
            p,
            layoutCx,
            layoutCy,
            outerR,
            ascendant,
            size,
          ),
        );

        if (!conflict) {
          placed.push(candidate);
          placedThis = true;
          break;
        }
      }
    }

    if (!placedThis) {
      placed.push({
        planet: item.planet,
        isAngle: item.isAngle,
        lineExtend: maxExtend,
        angleNudge: 0,
      });
    }
  }

  return placed;
}

function computeTransitLabelPad(size: number, layouts: TransitLabelLayout[]) {
  const { end } = transitLineStops(size);
  const maxExtend = layouts.reduce(
    (max, layout) => Math.max(max, layout.lineExtend),
    0,
  );
  return end + maxExtend + size * 0.02;
}

function fitTransitChartSize(
  items: Array<{ planet: ChartPlanet; isAngle?: boolean }>,
  ascendant: number,
  initialSize: number,
  maxWidth?: number,
) {
  let size = initialSize;

  for (let attempt = 0; attempt < 14; attempt++) {
    const outerR = size * 0.355;
    const layouts = computeTransitOuterLayouts(items, ascendant, outerR, size);
    const labelPad = computeTransitLabelPad(size, layouts);
    const totalSize = size + labelPad * 2;

    if (!maxWidth || totalSize <= maxWidth || attempt === 13) {
      return { size, outerR, layouts, labelPad, totalSize };
    }

    size = Math.max(180, Math.floor(size * (maxWidth / totalSize) * 0.96));
  }

  const outerR = size * 0.355;
  const layouts = computeTransitOuterLayouts(items, ascendant, outerR, size);
  const labelPad = computeTransitLabelPad(size, layouts);
  return { size, outerR, layouts, labelPad, totalSize: size + labelPad * 2 };
}

function transitLinePoint(
  cx: number,
  cy: number,
  outerR: number,
  radialPx: number,
  lineExtend: number,
  chartAngle: number,
) {
  return polarFromChartAngle(
    cx,
    cy,
    outerR + radialPx + lineExtend,
    chartAngle,
  );
}

/* ─── Transits: colored bi-wheel per design reference ─── */

function renderTransitOuterLabel(
  layout: TransitLabelLayout,
  cx: number,
  cy: number,
  outerR: number,
  ascendant: number,
  size: number,
) {
  const { planet, isAngle } = layout;
  const color = TRANSIT_LABEL_COLORS[planet.id] ?? '#FFFFFF';
  const { iconSize, degreeSize, degreeWidth } = transitLabelMetrics(size);
  const stops = transitLineStops(size);
  const { lineExtend } = layout;
  const chartAngle = transitLabelChartAngle(layout, ascendant);
  const planetIcon = PLANET_ICONS[planet.id];
  const degree =
    planet.degreeLabel?.replace('°', '') ??
    String(Math.floor(planet.eclipticDeg % 30));

  const planetPos = transitLinePoint(
    cx,
    cy,
    outerR,
    stops.planet,
    lineExtend,
    chartAngle,
  );
  const degreePos = transitLinePoint(
    cx,
    cy,
    outerR,
    stops.degree,
    lineExtend,
    chartAngle,
  );

  return (
    <React.Fragment key={`outer-${planet.id}`}>
      {!isAngle && planetIcon ? (
        <Image
          source={planetIcon}
          style={{
            position: 'absolute',
            left: planetPos.x - iconSize / 2,
            top: planetPos.y - iconSize / 2,
            width: iconSize,
            height: iconSize,
            tintColor: color,
          }}
          resizeMode="contain"
        />
      ) : null}
      {isAngle ? (
        <Text
          style={[
            styles.angleTag,
            {
              position: 'absolute',
              left: planetPos.x - size * 0.055,
              top: planetPos.y - degreeSize * 0.55,
              width: size * 0.11,
              textAlign: 'center',
              color,
              fontSize: degreeSize,
            },
          ]}
        >
          {planet.label}
        </Text>
      ) : null}
      {!isAngle ? (
        <Text
          style={[
            styles.degreeLarge,
            {
              position: 'absolute',
              left: degreePos.x - degreeWidth / 2,
              top: degreePos.y - degreeSize * 0.5,
              width: degreeWidth,
              textAlign: 'center',
              color,
              fontSize: degreeSize,
              lineHeight: degreeSize * 1.15,
            },
          ]}
        >
          {degree}
        </Text>
      ) : null}
      {!isAngle && planet.retrograde ? (
        <Text
          style={[
            styles.retroTag,
            {
              position: 'absolute',
              left: degreePos.x + degreeWidth * 0.2,
              top: degreePos.y - degreeSize * 0.72,
              color,
              fontSize: degreeSize * 0.62,
            },
          ]}
        >
          R
        </Text>
      ) : null}
    </React.Fragment>
  );
}

type InnerGlyphLayout = {
  planet: ChartPlanet;
  radius: number;
  angleNudge: number;
};

function innerGlyphPoint(
  layout: InnerGlyphLayout,
  cx: number,
  cy: number,
  ascendant: number,
) {
  return polarFromChartAngle(
    cx,
    cy,
    layout.radius,
    chartAngleDeg(layout.planet.eclipticDeg, ascendant) + layout.angleNudge,
  );
}

function innerGlyphsCollide(
  a: InnerGlyphLayout,
  b: InnerGlyphLayout,
  cx: number,
  cy: number,
  ascendant: number,
  glyphSize: number,
) {
  const pa = innerGlyphPoint(a, cx, cy, ascendant);
  const pb = innerGlyphPoint(b, cx, cy, ascendant);
  const minDist = glyphSize * 1.2;
  const dx = pa.x - pb.x;
  const dy = pa.y - pb.y;
  return dx * dx + dy * dy < minDist * minDist;
}

function computeInnerGlyphLayouts(
  planets: ChartPlanet[],
  ascendant: number,
  baseR: number,
  minR: number,
  maxR: number,
  size: number,
): InnerGlyphLayout[] {
  const glyphSize = size * 0.058;
  const layoutCx = 1000;
  const layoutCy = 1000;
  const sorted = [...planets].sort(
    (a, b) => a.eclipticDeg - b.eclipticDeg || a.id.localeCompare(b.id),
  );
  const placed: InnerGlyphLayout[] = [];
  const nudgeOrder = [0, 5, -5, 10, -10, 15, -15, 20, -20];
  const radialDeltas = [
    0,
    -size * 0.04,
    size * 0.04,
    -size * 0.08,
    size * 0.08,
    -size * 0.12,
  ];

  for (const planet of sorted) {
    let found = false;

    for (const radialDelta of radialDeltas) {
      const radius = Math.max(minR, Math.min(maxR, baseR + radialDelta));
      for (const angleNudge of nudgeOrder) {
        const candidate: InnerGlyphLayout = { planet, radius, angleNudge };
        const conflict = placed.some((p) =>
          innerGlyphsCollide(
            candidate,
            p,
            layoutCx,
            layoutCy,
            ascendant,
            glyphSize,
          ),
        );
        if (!conflict) {
          placed.push(candidate);
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      placed.push({ planet, radius: baseR, angleNudge: 0 });
    }
  }

  return placed;
}

function renderNatalInnerGlyph(
  layout: InnerGlyphLayout,
  cx: number,
  cy: number,
  ascendant: number,
  size: number,
) {
  const { planet } = layout;
  const icon = PLANET_ICONS[planet.id];
  if (!icon) return null;

  const glyphSize = size * 0.058;
  const pos = innerGlyphPoint(layout, cx, cy, ascendant);
  const half = glyphSize / 2;
  const color = TRANSIT_LABEL_COLORS[planet.id] ?? '#FFFFFF';

  return (
    <View
      key={`natal-glyph-${planet.id}`}
      style={[
        styles.birthPlanetGlow,
        {
          left: pos.x - half - 2,
          top: pos.y - half - 2,
          width: glyphSize + 4,
          height: glyphSize + 4,
        },
      ]}
    >
      <Image
        source={icon}
        style={{
          width: glyphSize,
          height: glyphSize,
          tintColor: color,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

function TransitChartWheel({
  model,
  size: maxTotal,
}: {
  model: ChartModel;
  size: number;
}) {
  const glowAnim = useWheelGlow();
  const { ascendant, houses } = model;

  const natalPlanets = useMemo(
    () =>
      (model.natalPlanets ??
        model.planets.filter((p) => p.mode !== 'transit')).filter((p) =>
        NATAL_BODIES.includes(p.id),
      ),
    [model],
  );
  const transitPlanets = useMemo(
    () =>
      model.transitPlanets ?? model.planets.filter((p) => p.mode === 'transit'),
    [model],
  );

  const outerLabelItems = useMemo(
    () => transitPlanets.map((planet) => ({ planet, isAngle: false })),
    [transitPlanets],
  );

  // Fit transit wheel inside the canvas with room for outer labels.
  const fitted = useMemo(() => {
    let wheelSize = Math.round(maxTotal * 0.92);
    let layouts: TransitLabelLayout[] = [];
    let outerR = 0;
    let zodiacInnerR = 0;
    let planetR = 0;
    let labelPad = 0;
    let totalSize = maxTotal;

    for (let attempt = 0; attempt < 10; attempt++) {
      const radii = wheelRadii(wheelSize);
      outerR = radii.outerR;
      zodiacInnerR = radii.zodiacInnerR;
      planetR = radii.planetR;
      layouts = computeTransitOuterLayouts(
        outerLabelItems,
        ascendant,
        outerR,
        wheelSize,
      );
      labelPad = computeTransitLabelPad(wheelSize, layouts);
      totalSize = wheelSize + labelPad * 2;
      if (totalSize <= maxTotal || attempt === 9) break;
      wheelSize = Math.max(
        220,
        Math.floor(wheelSize * (maxTotal / totalSize) * 0.98),
      );
    }

    return {
      wheelSize,
      layouts,
      outerR,
      zodiacInnerR,
      planetR,
      totalSize: Math.min(totalSize, maxTotal),
    };
  }, [ascendant, maxTotal, outerLabelItems]);

  const {
    wheelSize: size,
    layouts: outerLabelLayouts,
    outerR,
    zodiacInnerR,
    planetR,
    totalSize,
  } = fitted;

  const cx = totalSize / 2;
  const cy = totalSize / 2;
  const natalGlyphR = planetR * 0.92;
  const minNatalGlyphR = planetR * 0.42;
  const maxNatalGlyphR = zodiacInnerR * 0.86;

  const innerGlyphLayouts = useMemo(
    () =>
      computeInnerGlyphLayouts(
        natalPlanets,
        ascendant,
        natalGlyphR,
        minNatalGlyphR,
        maxNatalGlyphR,
        size,
      ),
    [
      natalPlanets,
      ascendant,
      natalGlyphR,
      minNatalGlyphR,
      maxNatalGlyphR,
      size,
    ],
  );

  return (
    <View style={[styles.birthWrap, { width: totalSize, height: totalSize }]}>
      <ChartWheelOverlay
        svgSize={totalSize}
        cx={cx}
        cy={cy}
        size={size}
        ascendant={ascendant}
        houses={houses}
        showHouseCusps
      />

      <MonochromeZodiacGlyphs
        cx={cx}
        cy={cy}
        size={size}
        ascendant={ascendant}
        glowAnim={glowAnim}
      />

      {innerGlyphLayouts.map((layout) =>
        renderNatalInnerGlyph(layout, cx, cy, ascendant, size),
      )}

      {outerLabelLayouts.map((layout) =>
        renderTransitOuterLabel(layout, cx, cy, outerR, ascendant, size),
      )}
    </View>
  );
}

export default function ChartWheel({ model, size }: Props) {
  if (model.kind === 'transit') {
    return <TransitChartWheel model={model} size={size} />;
  }
  return <BirthChartWheel model={model} size={size} />;
}

const styles = StyleSheet.create({
  birthWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  zodiacGlow: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  birthZodiacGlowOuter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetGlow: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  birthPlanetGlow: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerLabel: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  transitOuterStack: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  stackedLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  degreeLarge: {
    fontFamily: 'Nunito-Bold',
    includeFontPadding: false,
    lineHeight: undefined,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  retroTag: {
    fontFamily: 'Nunito-Bold',
    includeFontPadding: false,
  },
  angleTag: {
    fontSize: 10,
    fontFamily: 'Nunito-Bold',
    includeFontPadding: false,
  },
});

