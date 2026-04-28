import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
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
  { code: 'CANCER', label: 'Cancer', icon: require('../assets/images/zodiac/cancer.png') },
  { code: 'LEO', label: 'Leo', icon: require('../assets/images/zodiac/leo-active.png') },
  { code: 'VIRGO', label: 'Virgo', icon: require('../assets/images/zodiac/virgo.png') },
  { code: 'LIBRA', label: 'Libra', icon: require('../assets/images/zodiac/libra.png') },
  { code: 'SCORPIO', label: 'Scorpio', icon: require('../assets/images/zodiac/scorpio.png') },
  { code: 'SAGITTARIUS', label: 'Sagittarius', icon: require('../assets/images/zodiac/sagittarius.png') },
  { code: 'CAPRICORN', label: 'Capricorn', icon: require('../assets/images/zodiac/capricorn-active.png') },
  { code: 'AQUARIUS', label: 'Aquarius', icon: require('../assets/images/zodiac/aquarius-active.png') },
  { code: 'PISCES', label: 'Pisces', icon: require('../assets/images/zodiac/pisces-active.png') },
];

const ASPECT = SVG_VIEWBOX_H / SVG_VIEWBOX_W;

const SIGN_RELATIVE_POSITIONS: Record<string, { x: number; y: number }> = {
  ARIES: { x: 284.44 / SVG_VIEWBOX_W, y: 141.37 / SVG_VIEWBOX_H },
  TAURUS: { x: 312.17 / SVG_VIEWBOX_W, y: 197.29 / SVG_VIEWBOX_H },
  GEMINI: { x: 310.83 / SVG_VIEWBOX_W, y: 258.81 / SVG_VIEWBOX_H },
  CANCER: { x: 278.46 / SVG_VIEWBOX_W, y: 311.21 / SVG_VIEWBOX_H },
  LEO: { x: 225.98 / SVG_VIEWBOX_W, y: 342.19 / SVG_VIEWBOX_H },
  VIRGO: { x: 168.01 / SVG_VIEWBOX_W, y: 340.67 / SVG_VIEWBOX_H },
  LIBRA: { x: 115.17 / SVG_VIEWBOX_W, y: 309.89 / SVG_VIEWBOX_H },
  SCORPIO: { x: 82.64 / SVG_VIEWBOX_W, y: 256.44 / SVG_VIEWBOX_H },
  SAGITTARIUS: { x: 81.45 / SVG_VIEWBOX_W, y: 198.35 / SVG_VIEWBOX_H },
  CAPRICORN: { x: 113.9 / SVG_VIEWBOX_W, y: 146.38 / SVG_VIEWBOX_H },
  AQUARIUS: { x: 164.67 / SVG_VIEWBOX_W, y: 114.65 / SVG_VIEWBOX_H },
  PISCES: { x: 227.15 / SVG_VIEWBOX_W, y: 112.42 / SVG_VIEWBOX_H },
};

interface AstrowheelProps {
  size?: number;
  activeSet: Set<string>;
  onPressSign: (sign: ZodiacSign) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Astrowheel({
  size = SCREEN_WIDTH - 48,
  activeSet,
  onPressSign,
}: AstrowheelProps) {
  const width = size;
  const height = size * ASPECT;
  const tapSize = Math.round(size * 0.13);

  return (
    <View style={[styles.container, { width, height }]}>
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
        </Defs>

        {ZODIAC_SIGNS.map((sign) => {
          const paths = ZODIAC_SIGN_PATHS[sign.code];
          if (!paths) return null;
          const fill = activeSet.has(sign.code) ? 'url(#signActive)' : '#FFFFFF';
          return (
            <React.Fragment key={`sym-${sign.code}`}>
              {paths.map((d, i) => (
                <Path key={i} d={d} fill={fill} />
              ))}
            </React.Fragment>
          );
        })}
      </Svg>

      {ZODIAC_SIGNS.map((sign) => {
        if (!activeSet.has(sign.code)) return null;
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
    </View>
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
