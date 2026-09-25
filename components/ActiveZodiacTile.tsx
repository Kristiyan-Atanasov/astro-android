import React from 'react';
import Svg, {
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import {
  ZODIAC_GLYPH_OUTLINES,
  ZODIAC_GLYPH_VIEWBOX,
} from './zodiacGlyphPaths';

const GLYPH_SIZE = 52;
const CORNER_RADIUS = 18;

/**
 * Draws an active archetype's gradient and glyph in one native SVG surface.
 * Keeping both layers in the same surface avoids Android/OEM compositing bugs
 * that can hide absolutely positioned children inside a clipped touch target.
 */
export default function ActiveZodiacTile({
  code,
  size,
}: {
  code: string;
  size: number;
}) {
  const glyph = ZODIAC_GLYPH_OUTLINES[code];
  if (!glyph || size <= 0) return null;

  const gradientId = `active-zodiac-${code.toLowerCase()}`;
  const glyphScale = Math.min(0.7, GLYPH_SIZE / size);
  const glyphOffset = (ZODIAC_GLYPH_VIEWBOX * (1 - glyphScale)) / 2;
  const radius = (CORNER_RADIUS / size) * ZODIAC_GLYPH_VIEWBOX;

  return (
    <Svg
      width={size}
      height={size}
      pointerEvents="none"
      viewBox={`0 0 ${ZODIAC_GLYPH_VIEWBOX} ${ZODIAC_GLYPH_VIEWBOX}`}
    >
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#577CFB" />
          <Stop offset="94.51%" stopColor="#B283ED" />
        </SvgLinearGradient>
      </Defs>
      <Rect
        x={0}
        y={0}
        width={ZODIAC_GLYPH_VIEWBOX}
        height={ZODIAC_GLYPH_VIEWBOX}
        rx={radius}
        ry={radius}
        fill={`url(#${gradientId})`}
      />
      <G transform={`translate(${glyphOffset} ${glyphOffset})`}>
        <G transform={`scale(${glyphScale})`}>
          <Path d={glyph} fill="#FFFFFF" fillRule="evenodd" />
        </G>
      </G>
    </Svg>
  );
}
