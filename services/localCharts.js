// services/localCharts.js
//
// On-device natal + transit charts — no external API, no rate limits.
// Uses circular-natal-horoscope-js + ChartWheel (react-native-svg).

import { Origin, Horoscope } from 'circular-natal-horoscope-js';

const LOG = '[ProfileChart]';

const SIGN_ALIASES = {
  ARIES: 'ARIES',
  TAURUS: 'TAURUS',
  GEMINI: 'GEMINI',
  CANCER: 'CANCER',
  LEO: 'LEO',
  VIRGO: 'VIRGO',
  LIBRA: 'LIBRA',
  SCORPIO: 'SCORPIO',
  SAGITTARIUS: 'SAGITTARIUS',
  CAPRICORN: 'CAPRICORN',
  AQUARIUS: 'AQUARIUS',
  PISCES: 'PISCES',
};

const SIGN_FROM_LIB = {
  aries: 'ARIES',
  taurus: 'TAURUS',
  gemini: 'GEMINI',
  cancer: 'CANCER',
  leo: 'LEO',
  virgo: 'VIRGO',
  libra: 'LIBRA',
  scorpio: 'SCORPIO',
  sagittarius: 'SAGITTARIUS',
  capricorn: 'CAPRICORN',
  aquarius: 'AQUARIUS',
  pisces: 'PISCES',
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

const NATAL_POINTS = ['northnode', 'southnode'];

const ANGLE_IDS = ['ascendant', 'midheaven', 'descendant', 'imumcoeli'];

const NATAL_INNER_IDS = [...NATAL_BODIES, ...NATAL_POINTS, ...ANGLE_IDS];

const BODY_LABELS = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
  ascendant: 'AC',
  descendant: 'DC',
  midheaven: 'MC',
  imumcoeli: 'IC',
  northnode: 'NN',
  southnode: 'SN',
};

export function normalizeSignCode(value) {
  if (value == null) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const upper = raw.toUpperCase();
  if (SIGN_ALIASES[upper]) return SIGN_ALIASES[upper];

  const cleaned = upper.replace(/[^A-Z]/g, '');
  if (SIGN_ALIASES[cleaned]) return SIGN_ALIASES[cleaned];

  const lower = raw.toLowerCase();
  if (SIGN_FROM_LIB[lower]) return SIGN_FROM_LIB[lower];

  return '';
}

export function readBigThreeFromProfile(profile) {
  return {
    sun: normalizeSignCode(
      profile?.zodiac_sign ?? profile?.sun_sign ?? profile?.sun,
    ),
    moon: normalizeSignCode(profile?.moon_sign ?? profile?.moon),
    rising: normalizeSignCode(
      profile?.ascendant ?? profile?.rising_sign ?? profile?.rising,
    ),
  };
}

function pickNumber(obj, keys) {
  if (!obj) return null;
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'number' && Number.isFinite(val)) return val;
  }
  return null;
}

function parseBirthDateParts(birthDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(birthDate || ''));
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    date: Number(match[3]),
  };
}

export function parseBirthInput(profile) {
  const parts = parseBirthDateParts(profile?.birth_date);
  if (!parts) {
    console.log(LOG, 'missing or invalid birth_date', profile?.birth_date);
    return null;
  }

  const hour =
    typeof profile?.birth_hour === 'number' ? profile.birth_hour : 12;
  const minute =
    typeof profile?.birth_minute === 'number' ? profile.birth_minute : 0;

  let latitude = pickNumber(profile, [
    'birth_city_latitude',
    'birth_latitude',
    'latitude',
  ]);
  let longitude = pickNumber(profile, [
    'birth_city_longitude',
    'birth_longitude',
    'longitude',
  ]);

  if (latitude == null || longitude == null) {
    console.log(
      LOG,
      'missing coordinates — using Sofia fallback',
      { city: profile?.birth_city, latitude, longitude },
    );
    latitude = 42.6977;
    longitude = 23.3219;
  }

  return {
    year: parts.year,
    month: parts.month,
    date: parts.date,
    hour,
    minute,
    latitude,
    longitude,
    timeKnown:
      profile?.birth_hour != null && profile?.birth_minute != null,
  };
}

function signFromLibKey(key) {
  return SIGN_FROM_LIB[String(key || '').toLowerCase()] || '';
}

function readEclipticDeg(body) {
  const deg =
    body?.ChartPosition?.Ecliptic?.DecimalDegrees ??
    body?.ChartPosition?.StartPosition?.Ecliptic?.DecimalDegrees;
  return typeof deg === 'number' && Number.isFinite(deg) ? deg : null;
}

function buildHoroscope(input) {
  const origin = new Origin({
    year: input.year,
    month: input.month,
    date: input.date,
    hour: input.hour,
    minute: input.minute,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  return new Horoscope({
    origin,
    houseSystem: 'placidus',
    zodiac: 'tropical',
    aspectPoints: ['bodies', 'points', 'angles'],
    aspectWithPoints: ['bodies', 'points', 'angles'],
    aspectTypes: ['major'],
    customOrbs: {},
    language: 'en',
  });
}

function readNormDegree(body, eclipticDeg) {
  const formatted =
    body?.ChartPosition?.Ecliptic?.ArcDegreesFormatted30 ??
    body?.ChartPosition?.Ecliptic?.ArcDegreesFormatted;
  if (typeof formatted === 'string') {
    const match = /^(\d+)/.exec(formatted);
    if (match) return Number(match[1]);
  }
  return Math.floor(((eclipticDeg % 30) + 30) % 30);
}

function readInSignArc(body, eclipticDeg) {
  const formatted30 = body?.ChartPosition?.Ecliptic?.ArcDegreesFormatted30;
  if (typeof formatted30 === 'string') {
    const match = /^(\d+)°\s*(\d+)'\s*(\d+)/.exec(formatted30);
    if (match) {
      return {
        normDegree: Number(match[1]),
        arcMinutes: Number(match[2]),
        arcSeconds: Number(match[3]),
        positionLabel: `${match[1]}° ${match[2]}' ${match[3]}"`,
      };
    }
  }

  const inSign = ((eclipticDeg % 30) + 30) % 30;
  const normDegree = Math.floor(inSign);
  const minFloat = (inSign - normDegree) * 60;
  const arcMinutes = Math.floor(minFloat);
  const arcSeconds = Math.round((minFloat - arcMinutes) * 60);

  return {
    normDegree,
    arcMinutes,
    arcSeconds,
    positionLabel: `${normDegree}° ${arcMinutes}' ${arcSeconds}"`,
  };
}

function readHouseId(body, id) {
  const fromBody = body?.House?.id;
  if (typeof fromBody === 'number' && fromBody >= 1 && fromBody <= 12) {
    return fromBody;
  }
  if (id === 'ascendant') return 1;
  if (id === 'imumcoeli') return 4;
  if (id === 'descendant') return 7;
  if (id === 'midheaven') return 10;
  return null;
}

function normalizeEclipticDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

function signFromEclipticDeg(deg) {
  const signs = Object.values(SIGN_FROM_LIB);
  const index = Math.floor(normalizeEclipticDeg(deg) / 30) % 12;
  return signs[index] || '';
}

function extractOppositeAngle(id, sourceDeg, mode) {
  const eclipticDeg = normalizeEclipticDeg(sourceDeg + 180);
  const normDegree = Math.floor(((eclipticDeg % 30) + 30) % 30);
  const inSign = ((eclipticDeg % 30) + 30) % 30;
  const minFloat = (inSign - normDegree) * 60;
  const arcMinutes = Math.floor(minFloat);
  const arcSeconds = Math.round((minFloat - arcMinutes) * 60);

  return {
    id,
    label: BODY_LABELS[id] || id.toUpperCase(),
    eclipticDeg,
    normDegree,
    arcMinutes,
    arcSeconds,
    positionLabel: `${normDegree}° ${arcMinutes}' ${arcSeconds}"`,
    degreeLabel: `${normDegree}°`,
    sign: signFromEclipticDeg(eclipticDeg),
    house: readHouseId(null, id),
    retrograde: false,
    mode,
  };
}

function extractAngles(horoscope, mode) {
  const ascDeg = readEclipticDeg(horoscope.Ascendant);
  const mcDeg = readEclipticDeg(horoscope.Midheaven);
  const angles = [];

  const asc = extractBody('ascendant', horoscope.Ascendant, mode);
  if (asc) angles.push(asc);

  const mc = extractBody('midheaven', horoscope.Midheaven, mode);
  if (mc) angles.push(mc);

  if (ascDeg != null) {
    angles.push(extractOppositeAngle('descendant', ascDeg, mode));
  }
  if (mcDeg != null) {
    angles.push(extractOppositeAngle('imumcoeli', mcDeg, mode));
  }

  return angles;
}

function extractCelestialPoints(horoscope, mode) {
  const points = [];
  const celestialPoints = horoscope.CelestialPoints;
  if (!celestialPoints) return points;

  for (const id of NATAL_POINTS) {
    const item = extractBody(id, celestialPoints[id], mode);
    if (item) points.push(item);
  }

  return points;
}

function extractBody(id, body, mode) {
  const eclipticDeg = readEclipticDeg(body);
  if (eclipticDeg == null) return null;

  const arc = readInSignArc(body, eclipticDeg);

  return {
    id,
    label: BODY_LABELS[id] || id.toUpperCase(),
    eclipticDeg,
    normDegree: arc.normDegree,
    arcMinutes: arc.arcMinutes,
    arcSeconds: arc.arcSeconds,
    positionLabel: arc.positionLabel,
    degreeLabel: `${arc.normDegree}°`,
    sign: signFromLibKey(body?.Sign?.key),
    house: readHouseId(body, id),
    retrograde: Boolean(body?.isRetrograde),
    mode,
  };
}

const HARD_ASPECTS = new Set(['square', 'opposition']);

function aspectStyle(aspectKey) {
  if (HARD_ASPECTS.has(aspectKey)) {
    return { color: '#E85D5D', opacity: 0.9, width: 1.4 };
  }
  if (aspectKey === 'conjunction') {
    return { color: 'rgba(255,255,255,0.5)', opacity: 0.55, width: 1 };
  }
  return { color: '#577CFB', opacity: 0.45, width: 1 };
}

function extractAspects(horoscope) {
  const all = horoscope?.Aspects?.all ?? [];
  return all
    .filter(
      (aspect) =>
        NATAL_BODIES.includes(aspect.point1Key) &&
        NATAL_BODIES.includes(aspect.point2Key),
    )
    .map((aspect) => ({
      from: aspect.point1Key,
      to: aspect.point2Key,
      type: aspect.aspectKey,
      ...aspectStyle(aspect.aspectKey),
    }));
}

function angularDistance(a, b) {
  let diff = Math.abs(a - b);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function computeCrossAspects(natalPlanets, transitPlanets) {
  const defs = [
    { type: 'conjunction', angle: 0, orb: 8 },
    { type: 'opposition', angle: 180, orb: 8 },
    { type: 'square', angle: 90, orb: 7 },
    { type: 'trine', angle: 120, orb: 8 },
    { type: 'sextile', angle: 60, orb: 6 },
  ];

  const aspects = [];
  for (const natal of natalPlanets) {
    for (const transit of transitPlanets) {
      const diff = angularDistance(natal.eclipticDeg, transit.eclipticDeg);
      for (const def of defs) {
        if (Math.abs(diff - def.angle) <= def.orb) {
          aspects.push({
            from: natal.id,
            to: transit.id,
            type: def.type,
            cross: true,
            ...aspectStyle(def.type),
          });
          break;
        }
      }
    }
  }
  return aspects;
}

function extractChartModel(horoscope, mode) {
  const ascDeg = readEclipticDeg(horoscope.Ascendant);
  if (ascDeg == null) {
    console.log(LOG, 'could not read ascendant degree');
    return null;
  }

  const houses = [];
  for (let i = 0; i < 12; i += 1) {
    const house = horoscope.Houses[String(i)];
    const deg = readEclipticDeg(house);
    if (deg == null) continue;
    houses.push({
      index: i + 1,
      eclipticDeg: deg,
      sign: signFromLibKey(house?.Sign?.key),
    });
  }

  const planets = [];
  for (const id of NATAL_BODIES) {
    const body = horoscope.CelestialBodies?.[id];
    const item = extractBody(id, body, mode);
    if (item) planets.push(item);
  }

  planets.push(...extractCelestialPoints(horoscope, mode));
  planets.push(...extractAngles(horoscope, mode));

  return {
    kind: mode === 'transit' ? 'transit' : 'natal',
    ascendant: ascDeg,
    houses,
    planets,
    aspects: extractAspects(horoscope),
  };
}

export function computeBigThree(profile) {
  const input = parseBirthInput(profile);
  const fromProfile = readBigThreeFromProfile(profile);

  if (!input) {
    console.log(LOG, 'big three from profile only', fromProfile);
    return fromProfile;
  }

  try {
    const horoscope = buildHoroscope(input);
    const computed = {
      sun: signFromLibKey(horoscope.CelestialBodies?.sun?.Sign?.key),
      moon: signFromLibKey(horoscope.CelestialBodies?.moon?.Sign?.key),
      rising: signFromLibKey(horoscope.Ascendant?.Sign?.key),
    };

    const result = {
      sun: computed.sun || fromProfile.sun,
      moon: computed.moon || fromProfile.moon,
      rising: computed.rising || fromProfile.rising,
    };

    console.log(LOG, 'big three computed', {
      fromProfile,
      computed,
      result,
      birth: {
        date: profile?.birth_date,
        hour: input.hour,
        minute: input.minute,
        lat: input.latitude,
        lng: input.longitude,
      },
    });

    return result;
  } catch (e) {
    console.log(LOG, 'big three computation failed', e?.message ?? String(e));
    return fromProfile;
  }
}

export function buildNatalChartModel(profile) {
  const input = parseBirthInput(profile);
  if (!input) return null;

  try {
    const started = Date.now();
    const horoscope = buildHoroscope(input);
    const model = extractChartModel(horoscope, 'natal');
    console.log(LOG, 'natal chart built', {
      ms: Date.now() - started,
      planets: model?.planets?.length ?? 0,
      houses: model?.houses?.length ?? 0,
      ascendant: model?.ascendant,
    });
    return model;
  } catch (e) {
    console.log(LOG, 'natal chart failed', e?.message ?? String(e));
    return null;
  }
}

export function buildTransitChartModel(profile) {
  const input = parseBirthInput(profile);
  if (!input) return null;

  try {
    const started = Date.now();
    const now = new Date();

    const natalHoroscope = buildHoroscope(input);
    const natalModel = extractChartModel(natalHoroscope, 'natal');
    if (!natalModel) return null;

    const transitInput = {
      ...input,
      year: now.getFullYear(),
      month: now.getMonth(),
      date: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
    };

    const transitHoroscope = buildHoroscope(transitInput);
    const transitPlanets = [];

    for (const id of NATAL_BODIES) {
      const body = transitHoroscope.CelestialBodies?.[id];
      const item = extractBody(id, body, 'transit');
      if (item) transitPlanets.push(item);
    }

    const natalInner = natalModel.planets.filter((p) =>
      NATAL_INNER_IDS.includes(p.id),
    );

    const model = {
      kind: 'transit',
      ascendant: natalModel.ascendant,
      houses: natalModel.houses,
      planets: [...natalInner, ...transitPlanets],
      natalPlanets: natalInner,
      transitPlanets,
      aspects: computeCrossAspects(natalInner, transitPlanets),
    };

    console.log(LOG, 'transit chart built', {
      ms: Date.now() - started,
      natalPlanets: model.natalPlanets.length,
      transitPlanets: model.transitPlanets.length,
      at: now.toISOString(),
    });

    return model;
  } catch (e) {
    console.log(LOG, 'transit chart failed', e?.message ?? String(e));
    return null;
  }
}
