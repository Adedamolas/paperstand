import { create } from 'zustand';
import type { RenderTier, TierResult } from '@/src/lib/tier';

// Experience state machine (spec 2.1):
//
//   LOADING -> STAND -> PICK -> HELD <-> READ
//                ^                |
//                +---- PUTBACK <--+   (back / swipe down)
//   HELD -> TURNOVER -> HELD
//
// Each transition has exactly one owner animation. While one runs, input is ignored except
// "back". The scene drives timing and calls `finish*` when its animation completes.

export type Phase = 'LOADING' | 'STAND' | 'PICK' | 'HELD' | 'TURNOVER' | 'READ' | 'PUTBACK';

/** Where a picked paper came from: the table (folded, maybe under a neighbour) or the wall. */
export type PickSource = 'table' | 'wall';

type AppState = {
  phase: Phase;
  heldSlug: string | null;
  pickSource: PickSource;
  /** Latest tier verdict, including the FPS probe result. */
  tier: TierResult | null;
  /** Tier the Canvas was created with. Fixed for the context's lifetime. */
  renderTier: RenderTier | null;
  showHud: boolean;
  init: (tier: TierResult, showHud: boolean) => void;
  setTier: (tier: TierResult) => void;

  ready: () => void;
  pick: (slug: string, source: PickSource) => boolean;
  finishPick: () => void;
  putBack: () => boolean;
  finishPutBack: () => void;
  turnOver: () => boolean;
  finishTurnOver: () => void;
};

export const useApp = create<AppState>((set, get) => ({
  phase: 'LOADING',
  heldSlug: null,
  pickSource: 'table',
  tier: null,
  renderTier: null,
  showHud: false,
  // A 'none' verdict still renders at 'low' until the /lite redirect exists (M6).
  init: (tier, showHud) => set({ tier, showHud, renderTier: tier.tier === 'none' ? 'low' : tier.tier }),
  setTier: (tier) => set({ tier }),

  ready: () => get().phase === 'LOADING' && set({ phase: 'STAND' }),
  pick: (slug, source) => {
    if (get().phase !== 'STAND') return false;
    set({ phase: 'PICK', heldSlug: slug, pickSource: source });
    return true;
  },
  finishPick: () => get().phase === 'PICK' && set({ phase: 'HELD' }),
  // "Back" is allowed mid-transition: a pick in progress reverses into a put-back.
  putBack: () => {
    const { phase } = get();
    if (phase !== 'HELD' && phase !== 'PICK' && phase !== 'TURNOVER') return false;
    set({ phase: 'PUTBACK' });
    return true;
  },
  finishPutBack: () => get().phase === 'PUTBACK' && set({ phase: 'STAND', heldSlug: null }),
  turnOver: () => {
    if (get().phase !== 'HELD') return false;
    set({ phase: 'TURNOVER' });
    return true;
  },
  finishTurnOver: () => get().phase === 'TURNOVER' && set({ phase: 'HELD' }),
}));
