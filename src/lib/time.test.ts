import { describe, expect, it } from 'vitest';
import { editionStamp, isLateCity, lightingPresetFor, watDateKey, watHour } from './time';

describe('WAT helpers', () => {
  it('shifts UTC to WAT (UTC+1)', () => {
    // 23:30 UTC on 2 Oct is 00:30 WAT on 3 Oct
    const d = new Date('2026-10-02T23:30:00Z');
    expect(watDateKey(d)).toBe('2026-10-03');
    expect(watHour(d)).toBe(0);
  });

  it('labels Late City from 14:00 WAT', () => {
    expect(isLateCity(new Date('2026-10-03T12:59:00Z'))).toBe(false); // 13:59 WAT
    expect(isLateCity(new Date('2026-10-03T13:00:00Z'))).toBe(true); // 14:00 WAT
  });

  it('formats the edition stamp without em dashes', () => {
    const morning = editionStamp(new Date('2026-10-03T06:00:00Z'));
    expect(morning).toBe('Saturday 3 October 2026, Morning Edition');
    expect(editionStamp(new Date('2026-10-03T15:00:00Z'))).toBe(
      'Saturday 3 October 2026, Late City Edition',
    );
    expect(morning).not.toMatch(/—/);
  });

  it('maps hours to lighting presets', () => {
    expect(lightingPresetFor(7)).toBe('morning');
    expect(lightingPresetFor(13)).toBe('midday');
    expect(lightingPresetFor(17)).toBe('evening');
    expect(lightingPresetFor(22)).toBe('night');
    expect(lightingPresetFor(3)).toBe('night');
  });
});
