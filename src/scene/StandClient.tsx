'use client';

import dynamic from 'next/dynamic';
import type { EditionManifest } from '@/src/lib/manifest';

// three.js and the scene load after the HTML skeleton (spec 8 loading order).
const Stand = dynamic(() => import('./Stand').then((m) => m.Stand), { ssr: false });

export function StandClient(props: { manifest: EditionManifest | null; initialHeld?: string }) {
  return <Stand {...props} />;
}
