/** Geo utilities — Haversine distance, pace calculation, smoothing. */

export interface GeoPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  timestamp: number; // ms
  speed?: number | null; // m/s
  accuracy?: number | null; // meters
}

const EARTH_RADIUS_M = 6_371_000;

/** Haversine great-circle distance in meters */
export function haversine(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Running elevation gain — only counts upward deltas above a threshold */
export function computeElevationGain(points: GeoPoint[], threshold = 2): number {
  let gain = 0;
  let lastAlt: number | null = null;
  for (const p of points) {
    if (p.altitude == null) continue;
    if (lastAlt != null) {
      const diff = p.altitude - lastAlt;
      if (diff > threshold) gain += diff;
    }
    lastAlt = p.altitude;
  }
  return gain;
}

/** Total distance from a polyline, in meters */
export function totalDistance(points: GeoPoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += haversine(points[i - 1], points[i]);
  }
  return d;
}

/** Current pace from last N seconds (seconds per km) */
export function currentPace(points: GeoPoint[], windowSec = 20): number {
  if (points.length < 2) return 0;
  const now = points[points.length - 1].timestamp;
  const window = points.filter((p) => now - p.timestamp <= windowSec * 1000);
  if (window.length < 2) return 0;
  const dist = totalDistance(window);
  if (dist < 5) return 0; // too little movement — treat as paused
  const secs = (window[window.length - 1].timestamp - window[0].timestamp) / 1000;
  return (secs / dist) * 1000;
}

/** Average pace across full run */
export function averagePace(totalMeters: number, totalSeconds: number): number {
  if (totalMeters <= 0 || totalSeconds <= 0) return 0;
  return (totalSeconds / totalMeters) * 1000;
}

/** Filters out GPS outliers (accuracy > threshold, or huge jumps) */
export function cleanPoint(
  candidate: GeoPoint,
  previous: GeoPoint | null,
  maxAccuracy = 25,
  maxJumpMps = 12, // ~43 km/h → impossible for a runner
): boolean {
  if (candidate.accuracy != null && candidate.accuracy > maxAccuracy) return false;
  if (!previous) return true;
  const dt = (candidate.timestamp - previous.timestamp) / 1000;
  if (dt <= 0) return false;
  const d = haversine(previous, candidate);
  return d / dt <= maxJumpMps;
}
