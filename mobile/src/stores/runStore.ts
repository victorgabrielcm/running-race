import { create } from 'zustand';
import type { GeoPoint } from '@/utils/geo';
import {
  cleanPoint,
  totalDistance,
  currentPace,
  averagePace,
  computeElevationGain,
} from '@/utils/geo';

export type RunStatus = 'idle' | 'preparing' | 'running' | 'paused' | 'finished';

interface Split {
  km: number;
  timeSeconds: number;
  pace: number; // sec/km for this km
}

interface RunState {
  status: RunStatus;
  startedAt: number | null; // ms epoch
  pausedAt: number | null;
  pausedTotalMs: number;
  points: GeoPoint[];
  splits: Split[];
  // Derived (computed via selectors too, but cached)
  distanceM: number;
  elapsedSec: number;
  currentPaceSecPerKm: number;
  avgPaceSecPerKm: number;
  elevationGain: number;
  gpsSignal: 'searching' | 'weak' | 'strong' | 'lost';
  lastPointAt: number | null;

  // Actions
  prepare: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  pushPoint: (p: GeoPoint) => void;
  tick: () => void;
  setSignal: (s: RunState['gpsSignal']) => void;
}

export const useRunStore = create<RunState>((set, get) => ({
  status: 'idle',
  startedAt: null,
  pausedAt: null,
  pausedTotalMs: 0,
  points: [],
  splits: [],
  distanceM: 0,
  elapsedSec: 0,
  currentPaceSecPerKm: 0,
  avgPaceSecPerKm: 0,
  elevationGain: 0,
  gpsSignal: 'searching',
  lastPointAt: null,

  prepare: () => set({ status: 'preparing', gpsSignal: 'searching' }),

  start: () =>
    set({
      status: 'running',
      startedAt: Date.now(),
      pausedAt: null,
      pausedTotalMs: 0,
      points: [],
      splits: [],
      distanceM: 0,
      elapsedSec: 0,
      currentPaceSecPerKm: 0,
      avgPaceSecPerKm: 0,
      elevationGain: 0,
    }),

  pause: () =>
    set((s) => (s.status === 'running' ? { status: 'paused', pausedAt: Date.now() } : s)),

  resume: () =>
    set((s) => {
      if (s.status !== 'paused' || !s.pausedAt) return s;
      return {
        status: 'running',
        pausedAt: null,
        pausedTotalMs: s.pausedTotalMs + (Date.now() - s.pausedAt),
      };
    }),

  stop: () =>
    set((s) => {
      if (s.status === 'idle' || s.status === 'finished') return s;
      const pausedTotal = s.pausedAt
        ? s.pausedTotalMs + (Date.now() - s.pausedAt)
        : s.pausedTotalMs;
      const elapsedSec =
        s.startedAt != null
          ? (Date.now() - s.startedAt - pausedTotal) / 1000
          : 0;
      return {
        status: 'finished',
        pausedAt: null,
        pausedTotalMs: pausedTotal,
        elapsedSec: Math.max(0, elapsedSec),
        avgPaceSecPerKm: averagePace(s.distanceM, Math.max(1, elapsedSec)),
      };
    }),

  reset: () =>
    set({
      status: 'idle',
      startedAt: null,
      pausedAt: null,
      pausedTotalMs: 0,
      points: [],
      splits: [],
      distanceM: 0,
      elapsedSec: 0,
      currentPaceSecPerKm: 0,
      avgPaceSecPerKm: 0,
      elevationGain: 0,
      gpsSignal: 'searching',
      lastPointAt: null,
    }),

  pushPoint: (p) =>
    set((s) => {
      if (s.status !== 'running') {
        return { lastPointAt: Date.now() };
      }
      const last = s.points[s.points.length - 1] ?? null;
      if (!cleanPoint(p, last)) return { lastPointAt: Date.now() };

      const newPoints = [...s.points, p];
      const distanceM = totalDistance(newPoints);
      const cur = currentPace(newPoints);
      const elev = computeElevationGain(newPoints);

      // Track splits by full km crossed
      const splits = [...s.splits];
      const lastKm = splits.length;
      const crossedKm = Math.floor(distanceM / 1000);
      if (crossedKm > lastKm && s.startedAt) {
        const pausedTotal = s.pausedAt
          ? s.pausedTotalMs + (Date.now() - s.pausedAt)
          : s.pausedTotalMs;
        const timeSec = (Date.now() - s.startedAt - pausedTotal) / 1000;
        for (let k = lastKm + 1; k <= crossedKm; k++) {
          const prevSplitTime = splits.reduce((sum, sp) => sum + sp.timeSeconds, 0);
          const splitTime = timeSec - prevSplitTime;
          splits.push({ km: k, timeSeconds: splitTime, pace: splitTime });
        }
      }

      const signal: RunState['gpsSignal'] =
        p.accuracy != null && p.accuracy <= 10 ? 'strong'
          : p.accuracy != null && p.accuracy <= 25 ? 'weak'
          : 'weak';

      return {
        points: newPoints,
        distanceM,
        currentPaceSecPerKm: cur,
        elevationGain: elev,
        splits,
        gpsSignal: signal,
        lastPointAt: Date.now(),
      };
    }),

  tick: () =>
    set((s) => {
      if (s.status !== 'running' || s.startedAt == null) return s;
      const elapsedSec = (Date.now() - s.startedAt - s.pausedTotalMs) / 1000;
      // Lost signal if no point in 15s
      const signal =
        s.lastPointAt && Date.now() - s.lastPointAt > 15_000
          ? 'lost'
          : s.gpsSignal;
      return {
        elapsedSec: Math.max(0, elapsedSec),
        avgPaceSecPerKm: averagePace(s.distanceM, Math.max(1, elapsedSec)),
        gpsSignal: signal,
      };
    }),

  setSignal: (gpsSignal) => set({ gpsSignal }),
}));
