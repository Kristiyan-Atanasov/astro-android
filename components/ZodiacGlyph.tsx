import React from 'react';
import Svg, { Path } from 'react-native-svg';

import {
  ZODIAC_GLYPH_OUTLINES,
  ZODIAC_GLYPH_VIEWBOX,
} from './zodiacGlyphPaths';

/**
 * A zodiac symbol at any size, sharp at any size.
 *
 * This is the same thin icon set the app has always used — the art is
 * vectorised from the bitmaps in assets/images/zodiac, which are only ~50px
 * square and have no @2x or @3x variants, so they were being upscaled and
 * looked soft everywhere they appeared.
 *
 * The glyph fills `size` on its longest side, matching what
 * `resizeMode: 'contain'` did for those bitmaps, so this drops into their
 * place without moving anything.
 */
export default function ZodiacGlyph({
  code,
  size,
  color = '#FFFFFF',
}: {
  code: string;
  size: number;
  color?: string;
}) {
  const d = ZODIAC_GLYPH_OUTLINES[code];
  if (!d) return null;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${ZODIAC_GLYPH_VIEWBOX} ${ZODIAC_GLYPH_VIEWBOX}`}
    >
      <Path d={d} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
