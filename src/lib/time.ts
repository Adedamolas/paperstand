// WAT (Africa/Lagos, UTC+1, no DST) helpers. Everything date-shaped in
// Paperstand is expressed in WAT: edition dates, lighting presets, "Late City".

export const WAT_TZ = 'Africa/Lagos';

/** After this WAT hour, revisions are labelled "Late City Edition". */
export const LATE_CITY_HOUR = 14;

function watParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: WAT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { year: get('year'), month: get('month'), day: get('day'), hour: Number(get('hour')) };
}

/** `YYYY-MM-DD` in WAT. Used as the edition date and the layout seed. */
export function watDateKey(date: Date = new Date()): string {
  const { year, month, day } = watParts(date);
  return `${year}-${month}-${day}`;
}

/** Hour of day (0-23) in WAT. */
export function watHour(date: Date = new Date()): number {
  return watParts(date).hour;
}

export function isLateCity(date: Date = new Date()): boolean {
  return watHour(date) >= LATE_CITY_HOUR;
}

/** e.g. "Saturday 3 October 2026, Morning Edition". */
export function editionStamp(date: Date = new Date(), late = isLateCity(date)): string {
  const day = new Intl.DateTimeFormat('en-GB', {
    timeZone: WAT_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(date)
    .replace(',', '');
  return `${day}, ${late ? 'Late City Edition' : 'Morning Edition'}`;
}

export type LightingPreset = 'morning' | 'midday' | 'evening' | 'night';

export function lightingPresetFor(hour: number): LightingPreset {
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'midday';
  if (hour >= 16 && hour < 19) return 'evening';
  return 'night';
}
