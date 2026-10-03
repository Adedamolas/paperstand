'use client';

import { useEffect, useState } from 'react';
import styles from './TiltChip.module.css';

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/**
 * Opt-in gyro (spec 2.4). Off by default. iOS needs requestPermission() from a tap, which is why
 * this is a button. Reports tilt relative to the pose when it was switched on, clamped to -1..1.
 */
export function TiltChip({ onTilt }: { onTilt: (x: number, y: number) => void }) {
  const [on, setOn] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!on) {
      onTilt(0, 0);
      return;
    }
    let base: { b: number; g: number } | null = null;
    const handle = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      base ??= { b: e.beta, g: e.gamma };
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      onTilt(clamp((e.gamma - base.g) / 25), clamp(-(e.beta - base.b) / 25));
    };
    window.addEventListener('deviceorientation', handle);
    return () => window.removeEventListener('deviceorientation', handle);
  }, [on, onTilt]);

  if (typeof window !== 'undefined' && !('DeviceOrientationEvent' in window)) return null;

  const toggle = async () => {
    if (on) return setOn(false);
    const ctor = DeviceOrientationEvent as OrientationCtor;
    if (ctor.requestPermission) {
      try {
        if ((await ctor.requestPermission()) !== 'granted') return setDenied(true);
      } catch {
        return setDenied(true);
      }
    }
    setOn(true);
  };

  return (
    <button type="button" className={styles.chip} aria-pressed={on} onClick={toggle}>
      {denied ? 'Tilt not allowed' : on ? 'Tilt on' : 'Tilt to move the paper'}
    </button>
  );
}
