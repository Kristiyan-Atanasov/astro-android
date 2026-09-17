// components/archetypeMeta.ts
//
// Static per-archetype metadata used on the archetype detail screen.
// Backend doesn't currently expose ruler/element/intro for each sign,
// so we keep them hard-coded here. The element key is also used to
// pick a per-element background later (the user said they will provide
// 4+ background images for fire/earth/air/water).

export type ZodiacElement = 'fire' | 'earth' | 'air' | 'water';

// Per-element background photo shown behind the archetype + reading screens.
export const ELEMENT_BACKGROUNDS: Record<ZodiacElement, any> = {
  fire: require('../assets/images/fire.jpg'),
  earth: require('../assets/images/earth.jpg'),
  air: require('../assets/images/air.jpg'),
  water: require('../assets/images/water.jpg'),
};

// Pisces-only reading backgrounds. Picked at random when opening a quality
// reader for PISCES (not used on the archetype list screen).
export const PISCES_READING_BACKGROUNDS = [
  require('../assets/images/pisces/pisces-01.jpg'),
  require('../assets/images/pisces/pisces-02.jpg'),
  require('../assets/images/pisces/pisces-03.jpg'),
  require('../assets/images/pisces/pisces-04.jpg'),
  require('../assets/images/pisces/pisces-05.jpg'),
  require('../assets/images/pisces/pisces-06.jpg'),
  require('../assets/images/pisces/pisces-07.jpg'),
  require('../assets/images/pisces/pisces-08.jpg'),
  require('../assets/images/pisces/pisces-09.jpg'),
  require('../assets/images/pisces/pisces-10.jpg'),
  require('../assets/images/pisces/pisces-11.jpg'),
  require('../assets/images/pisces/pisces-12.jpg'),
  require('../assets/images/pisces/pisces-13.jpg'),
  require('../assets/images/pisces/pisces-14.jpg'),
];

export function pickPiscesReadingBackground() {
  const list = PISCES_READING_BACKGROUNDS;
  if (!list.length) return ELEMENT_BACKGROUNDS.water;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

// Libra-only reading backgrounds. Picked at random when opening a quality
// reader for LIBRA (not used on the archetype list screen).
export const LIBRA_READING_BACKGROUNDS = [
  require('../assets/images/libra/libra-01.jpg'),
  require('../assets/images/libra/libra-02.jpg'),
  require('../assets/images/libra/libra-03.jpg'),
  require('../assets/images/libra/libra-04.jpg'),
  require('../assets/images/libra/libra-05.jpg'),
  require('../assets/images/libra/libra-06.jpg'),
  require('../assets/images/libra/libra-07.jpg'),
  require('../assets/images/libra/libra-08.jpg'),
  require('../assets/images/libra/libra-09.jpg'),
  require('../assets/images/libra/libra-10.jpg'),
  require('../assets/images/libra/libra-11.jpg'),
  require('../assets/images/libra/libra-12.jpg'),
  require('../assets/images/libra/libra-13.jpg'),
  require('../assets/images/libra/libra-14.jpg'),
];

export function pickLibraReadingBackground() {
  const list = LIBRA_READING_BACKGROUNDS;
  if (!list.length) return ELEMENT_BACKGROUNDS.air;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

// Aquarius-only reading backgrounds. Picked at random when opening a quality
// reader for AQUARIUS (not used on the archetype list screen).
export const AQUARIUS_READING_BACKGROUNDS = [
  require('../assets/images/aquarius/aquarius-01.jpg'),
  require('../assets/images/aquarius/aquarius-02.jpg'),
  require('../assets/images/aquarius/aquarius-03.jpg'),
  require('../assets/images/aquarius/aquarius-04.jpg'),
  require('../assets/images/aquarius/aquarius-05.jpg'),
  require('../assets/images/aquarius/aquarius-06.jpg'),
  require('../assets/images/aquarius/aquarius-07.jpg'),
  require('../assets/images/aquarius/aquarius-08.jpg'),
  require('../assets/images/aquarius/aquarius-09.jpg'),
  require('../assets/images/aquarius/aquarius-10.jpg'),
  require('../assets/images/aquarius/aquarius-11.jpg'),
  require('../assets/images/aquarius/aquarius-12.jpg'),
  require('../assets/images/aquarius/aquarius-13.jpg'),
  require('../assets/images/aquarius/aquarius-14.jpg'),
];

export function pickAquariusReadingBackground() {
  const list = AQUARIUS_READING_BACKGROUNDS;
  if (!list.length) return ELEMENT_BACKGROUNDS.air;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

// Capricorn-only reading backgrounds. Picked at random when opening a quality
// reader for CAPRICORN (not used on the archetype list screen).
export const CAPRICORN_READING_BACKGROUNDS = [
  require('../assets/images/capricorn/capricorn-01.jpg'),
  require('../assets/images/capricorn/capricorn-02.jpg'),
  require('../assets/images/capricorn/capricorn-03.jpg'),
  require('../assets/images/capricorn/capricorn-04.jpg'),
  require('../assets/images/capricorn/capricorn-05.jpg'),
  require('../assets/images/capricorn/capricorn-06.jpg'),
  require('../assets/images/capricorn/capricorn-07.jpg'),
  require('../assets/images/capricorn/capricorn-08.jpg'),
  require('../assets/images/capricorn/capricorn-09.jpg'),
  require('../assets/images/capricorn/capricorn-10.jpg'),
  require('../assets/images/capricorn/capricorn-11.jpg'),
  require('../assets/images/capricorn/capricorn-12.jpg'),
  require('../assets/images/capricorn/capricorn-13.jpg'),
  require('../assets/images/capricorn/capricorn-14.jpg'),
];

export function pickCapricornReadingBackground() {
  const list = CAPRICORN_READING_BACKGROUNDS;
  if (!list.length) return ELEMENT_BACKGROUNDS.earth;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

// Sagittarius-only reading backgrounds. Picked at random when opening a quality
// reader for SAGITTARIUS (not used on the archetype list screen).
export const SAGITTARIUS_READING_BACKGROUNDS = [
  require('../assets/images/sagittarius/sagittarius-01.jpg'),
  require('../assets/images/sagittarius/sagittarius-02.jpg'),
  require('../assets/images/sagittarius/sagittarius-03.jpg'),
  require('../assets/images/sagittarius/sagittarius-04.jpg'),
  require('../assets/images/sagittarius/sagittarius-05.jpg'),
  require('../assets/images/sagittarius/sagittarius-06.jpg'),
  require('../assets/images/sagittarius/sagittarius-07.jpg'),
  require('../assets/images/sagittarius/sagittarius-08.jpg'),
  require('../assets/images/sagittarius/sagittarius-09.jpg'),
  require('../assets/images/sagittarius/sagittarius-10.jpg'),
  require('../assets/images/sagittarius/sagittarius-11.jpg'),
  require('../assets/images/sagittarius/sagittarius-12.jpg'),
  require('../assets/images/sagittarius/sagittarius-13.jpg'),
  require('../assets/images/sagittarius/sagittarius-14.jpg'),
];

export function pickSagittariusReadingBackground() {
  const list = SAGITTARIUS_READING_BACKGROUNDS;
  if (!list.length) return ELEMENT_BACKGROUNDS.fire;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

// Scorpio-only reading backgrounds. Picked at random when opening a quality
// reader for SCORPIO (not used on the archetype list screen).
export const SCORPIO_READING_BACKGROUNDS = [
  require('../assets/images/scorpio/scorpio-01.jpg'),
  require('../assets/images/scorpio/scorpio-02.jpg'),
  require('../assets/images/scorpio/scorpio-03.jpg'),
  require('../assets/images/scorpio/scorpio-04.jpg'),
  require('../assets/images/scorpio/scorpio-05.jpg'),
  require('../assets/images/scorpio/scorpio-06.jpg'),
  require('../assets/images/scorpio/scorpio-07.jpg'),
  require('../assets/images/scorpio/scorpio-08.jpg'),
  require('../assets/images/scorpio/scorpio-09.jpg'),
  require('../assets/images/scorpio/scorpio-10.jpg'),
  require('../assets/images/scorpio/scorpio-11.jpg'),
  require('../assets/images/scorpio/scorpio-12.jpg'),
  require('../assets/images/scorpio/scorpio-13.jpg'),
  require('../assets/images/scorpio/scorpio-14.jpg'),
];

export function pickScorpioReadingBackground() {
  const list = SCORPIO_READING_BACKGROUNDS;
  if (!list.length) return ELEMENT_BACKGROUNDS.water;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

// Virgo-only reading backgrounds. Picked at random when opening a quality
// reader for VIRGO (not used on the archetype list screen).
export const VIRGO_READING_BACKGROUNDS = [
  require('../assets/images/virgo/virgo-01.jpg'),
  require('../assets/images/virgo/virgo-02.jpg'),
  require('../assets/images/virgo/virgo-03.jpg'),
  require('../assets/images/virgo/virgo-04.jpg'),
  require('../assets/images/virgo/virgo-05.jpg'),
  require('../assets/images/virgo/virgo-06.jpg'),
  require('../assets/images/virgo/virgo-07.jpg'),
  require('../assets/images/virgo/virgo-08.jpg'),
  require('../assets/images/virgo/virgo-09.jpg'),
  require('../assets/images/virgo/virgo-10.jpg'),
  require('../assets/images/virgo/virgo-11.jpg'),
  require('../assets/images/virgo/virgo-12.jpg'),
  require('../assets/images/virgo/virgo-13.jpg'),
  require('../assets/images/virgo/virgo-14.jpg'),
];

export function pickVirgoReadingBackground() {
  const list = VIRGO_READING_BACKGROUNDS;
  if (!list.length) return ELEMENT_BACKGROUNDS.earth;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

// Leo-only reading backgrounds. Picked at random when opening a quality
// reader for LEO (not used on the archetype list screen).
export const LEO_READING_BACKGROUNDS = [
  require('../assets/images/leo/leo-01.jpg'),
  require('../assets/images/leo/leo-02.jpg'),
  require('../assets/images/leo/leo-03.jpg'),
  require('../assets/images/leo/leo-04.jpg'),
  require('../assets/images/leo/leo-05.jpg'),
  require('../assets/images/leo/leo-06.jpg'),
  require('../assets/images/leo/leo-07.jpg'),
  require('../assets/images/leo/leo-08.jpg'),
  require('../assets/images/leo/leo-09.jpg'),
  require('../assets/images/leo/leo-10.jpg'),
  require('../assets/images/leo/leo-11.jpg'),
  require('../assets/images/leo/leo-12.jpg'),
  require('../assets/images/leo/leo-13.jpg'),
  require('../assets/images/leo/leo-14.jpg'),
];

export function pickLeoReadingBackground() {
  const list = LEO_READING_BACKGROUNDS;
  if (!list.length) return ELEMENT_BACKGROUNDS.fire;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

// Cancer-only reading backgrounds. Picked at random when opening a quality
// reader for CANCER (not used on the archetype list screen).
export const CANCER_READING_BACKGROUNDS = [
  require('../assets/images/cancer/cancer-01.jpg'),
  require('../assets/images/cancer/cancer-02.jpg'),
  require('../assets/images/cancer/cancer-03.jpg'),
  require('../assets/images/cancer/cancer-04.jpg'),
  require('../assets/images/cancer/cancer-05.jpg'),
  require('../assets/images/cancer/cancer-06.jpg'),
  require('../assets/images/cancer/cancer-07.jpg'),
  require('../assets/images/cancer/cancer-08.jpg'),
  require('../assets/images/cancer/cancer-09.jpg'),
  require('../assets/images/cancer/cancer-10.jpg'),
  require('../assets/images/cancer/cancer-11.jpg'),
  require('../assets/images/cancer/cancer-12.jpg'),
  require('../assets/images/cancer/cancer-13.jpg'),
  require('../assets/images/cancer/cancer-14.jpg'),
];

export function pickCancerReadingBackground() {
  const list = CANCER_READING_BACKGROUNDS;
  if (!list.length) return ELEMENT_BACKGROUNDS.water;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

// Gemini-only reading backgrounds. Picked at random when opening a quality
// reader for GEMINI (not used on the archetype list screen).
export const GEMINI_READING_BACKGROUNDS = [
  require('../assets/images/gemini/gemini-01.jpg'),
  require('../assets/images/gemini/gemini-02.jpg'),
  require('../assets/images/gemini/gemini-03.jpg'),
  require('../assets/images/gemini/gemini-04.jpg'),
  require('../assets/images/gemini/gemini-05.jpg'),
  require('../assets/images/gemini/gemini-06.jpg'),
  require('../assets/images/gemini/gemini-07.jpg'),
  require('../assets/images/gemini/gemini-08.jpg'),
  require('../assets/images/gemini/gemini-09.jpg'),
  require('../assets/images/gemini/gemini-10.jpg'),
  require('../assets/images/gemini/gemini-11.jpg'),
  require('../assets/images/gemini/gemini-12.jpg'),
  require('../assets/images/gemini/gemini-13.jpg'),
  require('../assets/images/gemini/gemini-14.jpg'),
];

export function pickGeminiReadingBackground() {
  const list = GEMINI_READING_BACKGROUNDS;
  if (!list.length) return ELEMENT_BACKGROUNDS.air;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

// Taurus-only reading backgrounds. Picked at random when opening a quality
// reader for TAURUS (not used on the archetype list screen).
export const TAURUS_READING_BACKGROUNDS = [
  require('../assets/images/taurus/taurus-01.jpg'),
  require('../assets/images/taurus/taurus-02.jpg'),
  require('../assets/images/taurus/taurus-03.jpg'),
  require('../assets/images/taurus/taurus-04.jpg'),
  require('../assets/images/taurus/taurus-05.jpg'),
  require('../assets/images/taurus/taurus-06.jpg'),
  require('../assets/images/taurus/taurus-07.jpg'),
  require('../assets/images/taurus/taurus-08.jpg'),
  require('../assets/images/taurus/taurus-09.jpg'),
  require('../assets/images/taurus/taurus-10.jpg'),
  require('../assets/images/taurus/taurus-11.jpg'),
  require('../assets/images/taurus/taurus-12.jpg'),
  require('../assets/images/taurus/taurus-13.jpg'),
  require('../assets/images/taurus/taurus-14.jpg'),
];

export function pickTaurusReadingBackground() {
  const list = TAURUS_READING_BACKGROUNDS;
  if (!list.length) return ELEMENT_BACKGROUNDS.earth;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

// Aries-only reading backgrounds. Picked at random when opening a quality
// reader for ARIES (not used on the archetype list screen).
export const ARIES_READING_BACKGROUNDS = [
  require('../assets/images/aries/aries-01.jpg'),
  require('../assets/images/aries/aries-02.jpg'),
  require('../assets/images/aries/aries-03.jpg'),
  require('../assets/images/aries/aries-04.jpg'),
  require('../assets/images/aries/aries-05.jpg'),
  require('../assets/images/aries/aries-06.jpg'),
  require('../assets/images/aries/aries-07.jpg'),
  require('../assets/images/aries/aries-08.jpg'),
  require('../assets/images/aries/aries-09.jpg'),
  require('../assets/images/aries/aries-10.jpg'),
  require('../assets/images/aries/aries-11.jpg'),
  require('../assets/images/aries/aries-12.jpg'),
  require('../assets/images/aries/aries-13.jpg'),
  require('../assets/images/aries/aries-14.jpg'),
];

export function pickAriesReadingBackground() {
  const list = ARIES_READING_BACKGROUNDS;
  if (!list.length) return ELEMENT_BACKGROUNDS.fire;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

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
