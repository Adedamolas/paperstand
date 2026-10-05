// Lagos weather for the masthead ear (spec 3.1). Open-Meteo is free and needs no key.

export type Weather = { tempC: number; label: string };

const WMO: [number[], string][] = [
  [[0], 'Clear skies'],
  [[1, 2], 'Partly cloudy'],
  [[3], 'Overcast'],
  [[45, 48], 'Misty'],
  [[51, 53, 55, 56, 57], 'Drizzle'],
  [[61, 63, 80, 81], 'Showers'],
  [[65, 82], 'Heavy rain'],
  [[95, 96, 99], 'Thunderstorms'],
];

export async function lagosWeather(): Promise<Weather | undefined> {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=6.4541&longitude=3.3947&current=temperature_2m,weather_code&timezone=Africa%2FLagos',
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return undefined;
    const j = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
    const t = j.current?.temperature_2m;
    const code = j.current?.weather_code ?? -1;
    if (typeof t !== 'number') return undefined;
    return { tempC: Math.round(t), label: WMO.find(([codes]) => codes.includes(code))?.[1] ?? 'Fair' };
  } catch {
    return undefined;
  }
}
