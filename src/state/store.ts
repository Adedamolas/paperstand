import { create } from 'zustand';
import type { RenderTier, TierResult } from '@/src/lib/tier';

// Experience state machine (spec 2.1). M0 holds only the phase type and tier;
// transitions and their owner animations are implemented in M4.
export type Phase = 'LOADING' | 'STAND' | 'PICK' | 'HELD' | 'TURNOVER' | 'READ' | 'PUTBACK';

type AppState = {
  phase: Phase;
  /** Latest tier verdict, including the FPS probe result. */
  tier: TierResult | null;
  /** Tier the Canvas was created with. Fixed for the context's lifetime. */
  renderTier: RenderTier | null;
  showHud: boolean;
  init: (tier: TierResult, showHud: boolean) => void;
  setTier: (tier: TierResult) => void;
};

export const useApp = create<AppState>((set) => ({
  phase: 'LOADING',
  tier: null,
  renderTier: null,
  showHud: false,
  // A 'none' verdict still renders at 'low' until the /lite redirect exists (M6).
  init: (tier, showHud) =>
    set({ tier, showHud, renderTier: tier.tier === 'none' ? 'low' : tier.tier }),
  setTier: (tier) => set({ tier }),
}));
