import type { StravaActivity, WeeklyStats, PerformanceRecord } from '@/types';

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/** Monday 00:00 local of the week containing `date`. */
function weekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

function inWeek(activities: StravaActivity[], start: Date): StravaActivity[] {
  const end = new Date(start.getTime() + WEEK);
  return activities.filter((a) => {
    const d = new Date(a.start_date);
    return d >= start && d < end;
  });
}

export function onlyRuns(activities: StravaActivity[]): StravaActivity[] {
  return activities.filter((a) => a.type === 'Run' || a.sport_type === 'Run');
}

export function aggregate(
  activities: StravaActivity[],
  label: string,
  startDate: string,
): WeeklyStats {
  const runs = activities.length;
  const distance = activities.reduce((s, a) => s + a.distance / 1000, 0);
  const duration = activities.reduce((s, a) => s + a.moving_time / 60, 0);
  const elevation = activities.reduce((s, a) => s + (a.total_elevation_gain || 0), 0);
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);
  const totalMeters = activities.reduce((s, a) => s + a.distance, 0);
  const avgPace = totalMeters > 0 ? totalTime / (totalMeters / 1000) : 0;
  const hrSamples = activities.filter((a) => a.average_heartrate);
  const avgHr = hrSamples.length
    ? hrSamples.reduce((s, a) => s + (a.average_heartrate || 0), 0) / hrSamples.length
    : undefined;
  const load = activities.reduce((s, a) => s + (a.suffer_score || 0), 0);
  return {
    week: label,
    startDate,
    distance: Math.round(distance * 10) / 10,
    duration: Math.round(duration),
    elevation: Math.round(elevation),
    runs,
    avgPace: Math.round(avgPace),
    avgHeartRate: avgHr ? Math.round(avgHr) : undefined,
    load: Math.round(load),
  };
}

export function currentWeekStats(activities: StravaActivity[]): WeeklyStats {
  const runs = onlyRuns(activities);
  const start = weekStart(new Date());
  const weekRuns = inWeek(runs, start);
  return aggregate(weekRuns, 'Esta semana', start.toISOString());
}

/** Oldest-first series of the last N weeks, labels W1..WN. */
export function lastNWeeks(activities: StravaActivity[], n: number): WeeklyStats[] {
  const runs = onlyRuns(activities);
  const curStart = weekStart(new Date());
  const out: WeeklyStats[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(curStart.getTime() - i * WEEK);
    const weekRuns = inWeek(runs, start);
    out.push(aggregate(weekRuns, `W${n - i}`, start.toISOString()));
  }
  return out;
}

/**
 * Distância mínima (em metros) que uma corrida precisa ter pra entrar no
 * cálculo do PR daquela categoria. Usamos thresholds ligeiramente abaixo
 * dos valores oficiais (21.097 / 42.195) porque:
 *   - Apps de GPS tem erro de ±1% na distância
 *   - Treinos longos tipo "corrida de 21km" frequentemente vêm registrados
 *     como 20.8-21.2km — descartá-los perderia dados reais
 *   - O tempo do PR é extrapolado pelo pace × distância oficial depois, então
 *     não estamos mentindo sobre o tempo — só aceitando a corrida como prova.
 */
const PR_DISTANCES: { label: string; meters: number; officialMeters: number }[] = [
  { label: '1km', meters: 1000, officialMeters: 1000 },
  { label: '5k', meters: 4900, officialMeters: 5000 },
  { label: '10k', meters: 9800, officialMeters: 10000 },
  { label: '21k', meters: 20500, officialMeters: 21097 },
  { label: '42k', meters: 41000, officialMeters: 42195 },
  { label: 'Ultra', meters: 50000, officialMeters: 50000 },
];

export type PersonalRecordSlot = {
  distance: string; // "1km" | "5k" | "10k" | "21k" | "42k" | "Ultra"
  record: PerformanceRecord | null; // null = ainda não conquistado
};

/**
 * Returns ALL milestone distances. Slots without an eligible run get `record: null`
 * so the UI can render "Pendente". Same pace-extrapolation logic as before —
 * approximate PRs built from runs that covered at least the distance in question.
 */
export function personalRecordSlots(activities: StravaActivity[]): PersonalRecordSlot[] {
  const runs = onlyRuns(activities);
  return PR_DISTANCES.map(({ label, meters, officialMeters }) => {
    const candidates = runs.filter((a) => a.distance >= meters && a.moving_time > 0);
    if (candidates.length === 0) return { distance: label, record: null };
    const best = candidates.reduce((prev, cur) => {
      const prevPace = prev.moving_time / (prev.distance / 1000);
      const curPace = cur.moving_time / (cur.distance / 1000);
      return curPace < prevPace ? cur : prev;
    });
    const pace = best.moving_time / (best.distance / 1000);
    const time = pace * (officialMeters / 1000);
    return {
      distance: label,
      record: {
        distance: label,
        time: Math.round(time),
        pace: Math.round(pace),
        date: best.start_date,
        stravaActivityId: best.id,
      },
    };
  });
}

/**
 * Legacy: only conquered PRs (filtered). Kept for backwards compat.
 */
export function personalRecords(activities: StravaActivity[]): PerformanceRecord[] {
  return personalRecordSlots(activities)
    .filter((s) => s.record !== null)
    .map((s) => s.record as PerformanceRecord);
}
