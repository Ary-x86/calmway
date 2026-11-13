import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NEUTRAL_WEIGHTS, weightsFromSelection, type Trigger, type TriggerWeights } from '@/core/calm-score';
import type { UnitSystem } from '@/core/geo';
import type { AvoidOptions, CalmStrength } from '@/services/routing/profiles';
import { persistStorage } from './storage';

export type Appearance = 'system' | 'light' | 'dark';
export type UnitPref = 'auto' | UnitSystem;

export interface Prefs {
  onboarded: boolean;
  triggers: Trigger[];
  weights: TriggerWeights;
  strength: CalmStrength;
  /** Most extra minutes the driver accepts for a calmer route. */
  maxExtraMinutes: number;
  avoid: AvoidOptions;
  units: UnitPref;
  voice: boolean;
  voiceRate: number;
  reassurance: boolean;
  appearance: Appearance;
  simSpeed: number;
}

interface PrefsActions {
  set: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  setTriggers: (triggers: Trigger[]) => void;
  setAvoid: (key: keyof AvoidOptions, value: boolean) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

export const DEFAULT_PREFS: Prefs = {
  onboarded: false,
  triggers: [],
  weights: NEUTRAL_WEIGHTS,
  strength: 'calm',
  maxExtraMinutes: 20,
  avoid: { highways: false, tolls: false, ferries: false },
  units: 'auto',
  voice: true,
  voiceRate: 0.95,
  reassurance: true,
  appearance: 'system',
  simSpeed: 4,
};

export const usePrefs = create<Prefs & PrefsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFS,
      set: (key, value) => set({ [key]: value } as Partial<Prefs>),
      setTriggers: (triggers) => set({ triggers, weights: weightsFromSelection(triggers) }),
      setAvoid: (key, value) => set((s) => ({ avoid: { ...s.avoid, [key]: value } })),
      completeOnboarding: () => set({ onboarded: true }),
      reset: () => set({ ...DEFAULT_PREFS, onboarded: true }),
    }),
    { name: 'calmway.prefs', version: 1, storage: persistStorage },
  ),
);
