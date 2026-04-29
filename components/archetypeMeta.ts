// components/archetypeMeta.ts
//
// Static per-archetype metadata used on the archetype detail screen.
// Backend doesn't currently expose ruler/element/intro for each sign,
// so we keep them hard-coded here. The element key is also used to
// pick a per-element background later (the user said they will provide
// 4+ background images for fire/earth/air/water).

export type ZodiacElement = 'fire' | 'earth' | 'air' | 'water';

export interface ArchetypeMeta {
  code: string;
  label: string;
  ruler: string;
  element: ZodiacElement;
  elementLabel: string;
  description: string;
}

export const ARCHETYPE_META: Record<string, ArchetypeMeta> = {
  ARIES: {
    code: 'ARIES',
    label: 'Aries',
    ruler: 'Mars',
    element: 'fire',
    elementLabel: 'Fire',
    description:
      'Ruled by Mars, this archetype embodies courage, drive, and the spark of new beginnings. Aries leads from the front, bold and unfiltered, eager to start what others hesitate to try.',
  },
  TAURUS: {
    code: 'TAURUS',
    label: 'Taurus',
    ruler: 'Venus',
    element: 'earth',
    elementLabel: 'Earth',
    description:
      'Ruled by Venus, this archetype embodies steadiness, sensuality, and the patient pursuit of beauty. Taurus grounds itself in what is real, building slowly and savoring deeply.',
  },
  GEMINI: {
    code: 'GEMINI',
    label: 'Gemini',
    ruler: 'Mercury',
    element: 'air',
    elementLabel: 'Air',
    description:
      'Ruled by Mercury, this archetype embodies curiosity, wit, and the dance of ideas. Gemini moves between worlds with ease, weaving conversations and connections wherever it goes.',
  },
  CANCER: {
    code: 'CANCER',
    label: 'Cancer',
    ruler: 'Moon',
    element: 'water',
    elementLabel: 'Water',
    description:
      'Ruled by the Moon, this archetype embodies care, intuition, and the protection of what matters. Cancer feels deeply, holds space for others, and turns home into sanctuary.',
  },
  LEO: {
    code: 'LEO',
    label: 'Leo',
    ruler: 'Sun',
    element: 'fire',
    elementLabel: 'Fire',
    description:
      'Ruled by the Sun, this archetype embodies qualities of radiance, vitality and self-expression. It represents the core of who we are — our purpose and inner light. Just as the Sun shines at the center of the solar system, Leo energy inspires each of us to connect with our inner source of creativity, driving us to stand out, embrace and express ourselves fully. We’re called to celebrate life, acknowledge our gifts and inspire others.',
  },
  VIRGO: {
    code: 'VIRGO',
    label: 'Virgo',
    ruler: 'Mercury',
    element: 'earth',
    elementLabel: 'Earth',
    description:
      'Ruled by Mercury, this archetype embodies precision, devotion, and the art of refinement. Virgo seeks to improve, to serve, and to find meaning in the small details others overlook.',
  },
  LIBRA: {
    code: 'LIBRA',
    label: 'Libra',
    ruler: 'Venus',
    element: 'air',
    elementLabel: 'Air',
    description:
      'Ruled by Venus, this archetype embodies harmony, fairness, and the longing for connection. Libra weighs every side and softens edges, reaching for beauty in relationship.',
  },
  SCORPIO: {
    code: 'SCORPIO',
    label: 'Scorpio',
    ruler: 'Pluto',
    element: 'water',
    elementLabel: 'Water',
    description:
      'Ruled by Pluto, this archetype embodies depth, transformation, and the courage to face the unseen. Scorpio dives below the surface, alchemizing pain and intensity into power.',
  },
  SAGITTARIUS: {
    code: 'SAGITTARIUS',
    label: 'Sagittarius',
    ruler: 'Jupiter',
    element: 'fire',
    elementLabel: 'Fire',
    description:
      'Ruled by Jupiter, this archetype embodies expansion, freedom, and the search for meaning. Sagittarius aims its arrow at the horizon, hungry for truth and adventure.',
  },
  CAPRICORN: {
    code: 'CAPRICORN',
    label: 'Capricorn',
    ruler: 'Saturn',
    element: 'earth',
    elementLabel: 'Earth',
    description:
      'Ruled by Saturn, this archetype embodies discipline, ambition, and the patient climb toward mastery. Capricorn builds structures meant to last and honors the weight of responsibility.',
  },
  AQUARIUS: {
    code: 'AQUARIUS',
    label: 'Aquarius',
    ruler: 'Uranus',
    element: 'air',
    elementLabel: 'Air',
    description:
      'Ruled by Uranus, this archetype embodies innovation, individuality, and the vision of what could be. Aquarius questions the status quo and dreams in service of the collective.',
  },
  PISCES: {
    code: 'PISCES',
    label: 'Pisces',
    ruler: 'Neptune',
    element: 'water',
    elementLabel: 'Water',
    description:
      'Ruled by Neptune, this archetype embodies imagination, compassion, and the dissolving of boundaries. Pisces feels the unseen current, channeling empathy and dream into the world.',
  },
};

export function getArchetypeMeta(code: string): ArchetypeMeta | null {
  if (!code) return null;
  return ARCHETYPE_META[code.toUpperCase()] ?? null;
}
