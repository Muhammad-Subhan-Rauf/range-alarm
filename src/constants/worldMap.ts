/**
 * Stylized world map data for the timezone picker.
 *
 * Coordinate system used in this file:
 *   viewBox = [0, 0, 360, 180]
 *   x = longitude + 180  (so 0 = -180°, 360 = +180°)
 *   y = 90 - latitude    (so 0 = north pole, 180 = south pole)
 *
 * Continent paths are deliberately simplified — recognizable silhouettes
 * rather than accurate geography. The world is just background for the
 * tappable city dots.
 */

/** Rough continent polygons in equirectangular space. */
export const CONTINENT_PATHS: string[] = [
  // North America
  'M 35,30 L 60,28 L 90,32 L 115,42 L 122,55 L 110,75 L 98,85 L 75,80 L 55,82 L 40,72 L 30,58 L 28,45 Z',
  // Central America bridge
  'M 95,82 L 110,82 L 118,92 L 110,98 L 100,95 Z',
  // South America
  'M 105,92 L 125,92 L 138,108 L 138,128 L 128,148 L 118,155 L 110,148 L 105,128 L 102,108 Z',
  // Greenland (small)
  'M 140,18 L 158,18 L 162,32 L 152,40 L 142,32 Z',
  // Europe
  'M 168,38 L 200,32 L 215,38 L 218,52 L 205,60 L 188,62 L 172,55 L 168,46 Z',
  // Africa
  'M 178,70 L 215,70 L 225,90 L 230,108 L 218,135 L 200,148 L 188,140 L 178,118 L 175,95 Z',
  // Middle East / West Asia bridge
  'M 215,62 L 240,62 L 245,75 L 238,82 L 220,80 L 213,72 Z',
  // Russia / Northern Asia
  'M 210,26 L 320,26 L 335,40 L 330,55 L 295,58 L 260,55 L 230,52 L 210,42 Z',
  // South + Southeast Asia
  'M 245,72 L 280,72 L 300,80 L 305,98 L 295,108 L 278,102 L 260,98 L 248,88 Z',
  // East Asia (China/Korea/Japan)
  'M 290,55 L 325,55 L 335,75 L 328,92 L 315,100 L 302,95 L 290,82 L 290,68 Z',
  // Japan (separate)
  'M 332,55 L 340,55 L 343,68 L 335,72 Z',
  // Indonesia / SE Asia islands
  'M 295,108 L 320,108 L 322,118 L 305,118 Z',
  // Australia
  'M 290,128 L 330,128 L 340,142 L 330,152 L 305,150 L 292,142 Z',
  // New Zealand
  'M 340,148 L 348,148 L 350,158 L 342,160 Z',
];

/** Faint, evenly-spaced UTC offset bands for orientation. */
export const UTC_BAND_COUNT = 24;

export type TimezoneCity = {
  id: string;
  label: string;
  timezone: string;
  /** Latitude in degrees, -90..90 */
  lat: number;
  /** Longitude in degrees, -180..180 */
  lng: number;
};

/** Major cities, one per common IANA timezone. Placement uses real lat/lng. */
export const TIMEZONE_CITIES: TimezoneCity[] = [
  { id: 'hawaii',      label: 'Honolulu',        timezone: 'Pacific/Honolulu',     lat: 21.32,  lng: -157.86 },
  { id: 'anchorage',   label: 'Anchorage',       timezone: 'America/Anchorage',    lat: 61.22,  lng: -149.90 },
  { id: 'losangeles',  label: 'Los Angeles',     timezone: 'America/Los_Angeles',  lat: 34.05,  lng: -118.24 },
  { id: 'denver',      label: 'Denver',          timezone: 'America/Denver',       lat: 39.74,  lng: -104.99 },
  { id: 'chicago',     label: 'Chicago',         timezone: 'America/Chicago',      lat: 41.88,  lng: -87.63  },
  { id: 'newyork',     label: 'New York',        timezone: 'America/New_York',     lat: 40.71,  lng: -74.01  },
  { id: 'caracas',     label: 'Caracas',         timezone: 'America/Caracas',      lat: 10.49,  lng: -66.88  },
  { id: 'saopaulo',    label: 'São Paulo',       timezone: 'America/Sao_Paulo',    lat: -23.55, lng: -46.63  },
  { id: 'azores',      label: 'Azores',          timezone: 'Atlantic/Azores',      lat: 37.74,  lng: -25.67  },
  { id: 'reykjavik',   label: 'Reykjavík',       timezone: 'Atlantic/Reykjavik',   lat: 64.13,  lng: -21.82  },
  { id: 'london',      label: 'London',          timezone: 'Europe/London',        lat: 51.51,  lng: -0.13   },
  { id: 'paris',       label: 'Paris',           timezone: 'Europe/Paris',         lat: 48.86,  lng: 2.35    },
  { id: 'cairo',       label: 'Cairo',           timezone: 'Africa/Cairo',         lat: 30.04,  lng: 31.24   },
  { id: 'johannesburg',label: 'Johannesburg',    timezone: 'Africa/Johannesburg',  lat: -26.20, lng: 28.05   },
  { id: 'moscow',      label: 'Moscow',          timezone: 'Europe/Moscow',        lat: 55.75,  lng: 37.62   },
  { id: 'dubai',       label: 'Dubai',           timezone: 'Asia/Dubai',           lat: 25.20,  lng: 55.27   },
  { id: 'karachi',     label: 'Karachi',         timezone: 'Asia/Karachi',         lat: 24.86,  lng: 67.01   },
  { id: 'mumbai',      label: 'Mumbai',          timezone: 'Asia/Kolkata',         lat: 19.08,  lng: 72.88   },
  { id: 'dhaka',       label: 'Dhaka',           timezone: 'Asia/Dhaka',           lat: 23.81,  lng: 90.41   },
  { id: 'bangkok',     label: 'Bangkok',         timezone: 'Asia/Bangkok',         lat: 13.76,  lng: 100.50  },
  { id: 'singapore',   label: 'Singapore',       timezone: 'Asia/Singapore',       lat: 1.35,   lng: 103.82  },
  { id: 'shanghai',    label: 'Shanghai',        timezone: 'Asia/Shanghai',        lat: 31.23,  lng: 121.47  },
  { id: 'tokyo',       label: 'Tokyo',           timezone: 'Asia/Tokyo',           lat: 35.69,  lng: 139.69  },
  { id: 'sydney',      label: 'Sydney',          timezone: 'Australia/Sydney',     lat: -33.87, lng: 151.21  },
  { id: 'auckland',    label: 'Auckland',        timezone: 'Pacific/Auckland',     lat: -36.85, lng: 174.76  },
];

export const lngToX = (lng: number): number => lng + 180;
export const latToY = (lat: number): number => 90 - lat;
