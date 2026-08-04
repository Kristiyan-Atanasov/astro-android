import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import WheelSvg from '../assets/images/astro-wheel.svg';
import {
  ZODIAC_SIGN_PATHS,
  SVG_VIEWBOX_W,
  SVG_VIEWBOX_H,
} from './zodiacSignPaths';

export interface ZodiacSign {
  code: string;
  label: string;
  icon: ImageSourcePropType;
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  { code: 'ARIES', label: 'Aries', icon: require('../assets/images/zodiac/aries.png') },
  { code: 'TAURUS', label: 'Taurus', icon: require('../assets/images/zodiac/taurus.png') },
  { code: 'GEMINI', label: 'Gemini', icon: require('../assets/images/zodiac/gemini.png') },
  // NOTE: the source asset files are mislabeled — cancer.png actually holds
  // the Pisces glyph and pisces-active.png holds the Cancer glyph, so the
  // requires are intentionally crossed here to render the correct symbols.
  { code: 'CANCER', label: 'Cancer', icon: require('../assets/images/zodiac/pisces-active.png') },
  { code: 'LEO', label: 'Leo', icon: require('../assets/images/zodiac/leo-active.png') },
  { code: 'VIRGO', label: 'Virgo', icon: require('../assets/images/zodiac/virgo.png') },
  { code: 'LIBRA', label: 'Libra', icon: require('../assets/images/zodiac/libra.png') },
  { code: 'SCORPIO', label: 'Scorpio', icon: require('../assets/images/zodiac/scorpio.png') },
  { code: 'SAGITTARIUS', label: 'Sagittarius', icon: require('../assets/images/zodiac/sagittarius.png') },
  { code: 'CAPRICORN', label: 'Capricorn', icon: require('../assets/images/zodiac/capricorn-active.png') },
  { code: 'AQUARIUS', label: 'Aquarius', icon: require('../assets/images/zodiac/aquarius-active.png') },
  { code: 'PISCES', label: 'Pisces', icon: require('../assets/images/zodiac/cancer.png') },
];

const ASPECT = SVG_VIEWBOX_H / SVG_VIEWBOX_W;
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Geometry of the wheel inside the SVG viewBox. The wheel is centred in
// the viewBox; signs are arranged on a circle around that centre.
const WHEEL_CENTER_X = SVG_VIEWBOX_W / 2;
const WHEEL_CENTER_Y = SVG_VIEWBOX_H / 2;

// The light beam reaches outward from the wheel centre to just inside
// the ring where the glyphs are drawn. Tuned visually against the
// reference design.
const BEAM_OUTER_RADIUS = 108;
// Each zodiac sector spans 30°. The beam fills nearly that full slice.
const BEAM_ANGULAR_SPAN_DEG = 28;

// Soft shimmer applied on top of the static beam opacity.
const PULSE_DURATION = 1500;
const PULSE_MIN_OPACITY = 0.62;

const SIGN_RELATIVE_POSITIONS: Record<string, { x: number; y: number }> = {
  ARIES: { x: 227.15 / SVG_VIEWBOX_W, y: 112.42 / SVG_VIEWBOX_H },
  TAURUS: { x: 284.44 / SVG_VIEWBOX_W, y: 141.37 / SVG_VIEWBOX_H },
  GEMINI: { x: 312.17 / SVG_VIEWBOX_W, y: 197.29 / SVG_VIEWBOX_H },
  CANCER: { x: 310.83 / SVG_VIEWBOX_W, y: 258.81 / SVG_VIEWBOX_H },
  LEO: { x: 278.46 / SVG_VIEWBOX_W, y: 311.21 / SVG_VIEWBOX_H },
  VIRGO: { x: 225.98 / SVG_VIEWBOX_W, y: 342.19 / SVG_VIEWBOX_H },
  LIBRA: { x: 168.01 / SVG_VIEWBOX_W, y: 340.67 / SVG_VIEWBOX_H },
  SCORPIO: { x: 115.17 / SVG_VIEWBOX_W, y: 309.89 / SVG_VIEWBOX_H },
  SAGITTARIUS: { x: 82.64 / SVG_VIEWBOX_W, y: 256.44 / SVG_VIEWBOX_H },
  CAPRICORN: { x: 81.45 / SVG_VIEWBOX_W, y: 198.35 / SVG_VIEWBOX_H },
  AQUARIUS: { x: 113.9 / SVG_VIEWBOX_W, y: 146.38 / SVG_VIEWBOX_H },
  PISCES: { x: 164.67 / SVG_VIEWBOX_W, y: 114.65 / SVG_VIEWBOX_H },
};

// Angle (degrees) from the wheel centre to each sign's glyph. SVG y axis
// points down, so atan2(dy, dx) already gives the orientation we need
// for drawing wedges with the standard cos/sin formulae.
const SIGN_ANGLES_DEG: Record<string, number> = Object.entries(
  SIGN_RELATIVE_POSITIONS,
).reduce<Record<string, number>>((acc, [code, pos]) => {
  const x = pos.x * SVG_VIEWBOX_W;
  const y = pos.y * SVG_VIEWBOX_H;
  const angle = (Math.atan2(y - WHEEL_CENTER_Y, x - WHEEL_CENTER_X) * 180) / Math.PI;
  acc[code] = angle;
  return acc;
}, {});

// Build the SVG `d` for a pie slice whose apex is at (cx, cy), spanning
// `spanDeg` degrees centred on `midAngleDeg`, out to radius `r`.
function buildWedgePath(
  cx: number,
  cy: number,
  r: number,
  midAngleDeg: number,
  spanDeg: number,
): string {
  const halfSpanRad = ((spanDeg / 2) * Math.PI) / 180;
  const midRad = (midAngleDeg * Math.PI) / 180;
  const startRad = midRad - halfSpanRad;
  const endRad = midRad + halfSpanRad;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = spanDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

interface AstrowheelProps {
  size?: number;
  activeSet: Set<string>;
  onPressSign: (sign: ZodiacSign) => void;
  /**
   * When true, renders the sign code (e.g. ARIES) next to each glyph.
   * Useful for verifying / debugging the wheel mapping.
   */
  debugLabels?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const ROLL_DURATION = 3400;
const FADE_DURATION = 800;
const FADE_DELAY = 2900;

export default function Astrowheel({
  size = SCREEN_WIDTH - 48,
  activeSet,
  onPressSign,
  debugLabels = false,
}: AstrowheelProps) {
  const width = size;
  const height = size * ASPECT;
  const tapSize = Math.round(size * 0.13);

  const rollProgress = useRef(new Animated.Value(0)).current;
  const signsOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;
  const initialPlayed = useRef(false);

  // Roll the wheel in on mount.
  useEffect(() => {
    rollProgress.setValue(0);
    Animated.timing(rollProgress, {
      toValue: 1,
      duration: ROLL_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [rollProgress]);

  // Fade the active signs to gradient on mount and whenever active set changes.
  const activeKey = useMemo(
    () => Array.from(activeSet).sort().join(','),
    [activeSet],
  );

  useEffect(() => {
    signsOpacity.setValue(0);
    const delay = initialPlayed.current ? 0 : FADE_DELAY;
    Animated.timing(signsOpacity, {
      toValue: 1,
      duration: FADE_DURATION,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      initialPlayed.current = true;
    });
  }, [activeKey, signsOpacity]);

  // Continuous, gentle shimmer applied on top of the static halo opacity so
  // the active glyphs feel "alive" instead of being a flat colour wash.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: PULSE_MIN_OPACITY,
          duration: PULSE_DURATION,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: PULSE_DURATION,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glowPulse]);

  // Multiply the fade-in by the pulse so that a brand new mount still
  // ramps the halos up smoothly before the shimmer takes over.
  const glowOpacity = Animated.multiply(signsOpacity, glowPulse);

  const wheelRotate = rollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-360deg', '0deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { width, height, transform: [{ rotate: wheelRotate }] },
      ]}
    >
      <WheelSvg width={width} height={height} />

      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${SVG_VIEWBOX_W} ${SVG_VIEWBOX_H}`}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="signActive" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#B283ED" stopOpacity="1" />
            <Stop offset="1" stopColor="#577CFB" stopOpacity="1" />
          </LinearGradient>
          {/*
            Beam gradient: anchored at the wheel centre in user space so
            the same gradient lights up every active wedge identically.
            Brightest in the middle of the wedge length, falling to zero
            at both the centre apex and the outer rim near the glyph.
          */}
          <RadialGradient
            id="signBeam"
            cx={WHEEL_CENTER_X}
            cy={WHEEL_CENTER_Y}
            r={BEAM_OUTER_RADIUS}
            fx={WHEEL_CENTER_X}
            fy={WHEEL_CENTER_Y}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="22%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <Stop offset="42%" stopColor="#E2D2FF" stopOpacity="0.45" />
            <Stop offset="70%" stopColor="#9A7AF0" stopOpacity="0.18" />
            <Stop offset="100%" stopColor="#577CFB" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/*
          One wedge of light per active sign, drawn before the glyphs so
          the symbol stays crisp on top of the beam.
        */}
        {ZODIAC_SIGNS.map((sign) => {
          if (!activeSet.has(sign.code)) return null;
          const angle = SIGN_ANGLES_DEG[sign.code];
          if (angle == null) return null;
          const d = buildWedgePath(
            WHEEL_CENTER_X,
            WHEEL_CENTER_Y,
            BEAM_OUTER_RADIUS,
            angle,
            BEAM_ANGULAR_SPAN_DEG,
          );
          return (
            <AnimatedPath
              key={`beam-${sign.code}`}
              d={d}
              fill="url(#signBeam)"
              opacity={glowOpacity}
            />
          );
        })}

        {ZODIAC_SIGNS.map((sign) => {
          const paths = ZODIAC_SIGN_PATHS[sign.code];
          if (!paths) return null;
          const active = activeSet.has(sign.code);
          const pos = SIGN_RELATIVE_POSITIONS[sign.code];
          return (
            <React.Fragment key={`sym-${sign.code}`}>
              {paths.map((d, i) => (
                <Path key={`w-${i}`} d={d} fill="#FFFFFF" />
              ))}
              {active &&
                paths.map((d, i) => (
                  <AnimatedPath
                    key={`g-${i}`}
                    d={d}
                    fill="url(#signActive)"
                    opacity={signsOpacity}
                  />
                ))}
              {debugLabels && pos && (
                <SvgText
                  x={pos.x * SVG_VIEWBOX_W}
                  y={pos.y * SVG_VIEWBOX_H + 22}
                  fill="#FF4D88"
                  fontSize={10}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {sign.code}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>

      {/*
        Tap targets for every sign. The "active" highlight on the wheel
        is just a hint of what's relevant to the user; tapping any sign
        (active or not) opens its archetype detail screen.
      */}
      {ZODIAC_SIGNS.map((sign) => {
        const pos = SIGN_RELATIVE_POSITIONS[sign.code];
        if (!pos) return null;

        const cx = pos.x * width;
        const cy = pos.y * height;

        return (
          <TouchableOpacity
            key={`tap-${sign.code}`}
            activeOpacity={0.5}
            onPress={() => onPressSign(sign)}
            style={[
              styles.tapTarget,
              {
                left: cx - tapSize / 2,
                top: cy - tapSize / 2,
                width: tapSize,
                height: tapSize,
                borderRadius: tapSize / 2,
              },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  tapTarget: {
    position: 'absolute',
  },
});
