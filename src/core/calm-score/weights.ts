/**
 * What a driver can tell us stresses them. Each trigger scales a group of
 * stress events. 1 is neutral, higher means "this really gets to me".
 */
export type Trigger = 'highways' | 'merging' | 'turnsAcross' | 'roundabouts' | 'complexJunctions';

export type TriggerWeights = Record<Trigger, number>;

export const TRIGGERS: { id: Trigger; title: string; detail: string }[] = [
  { id: 'highways', title: 'Highways and fast roads', detail: 'High speeds, trucks, long stretches with no way off' },
  { id: 'merging', title: 'Merging and on-ramps', detail: 'Finding a gap in fast traffic' },
  { id: 'turnsAcross', title: 'Turning across traffic', detail: 'Unprotected turns and U-turns' },
  { id: 'roundabouts', title: 'Roundabouts', detail: 'Picking the right lane and exit' },
  { id: 'complexJunctions', title: 'Complicated junctions', detail: 'Forks, lane choices and turns in quick succession' },
];

export const NEUTRAL_WEIGHTS: TriggerWeights = {
  highways: 1,
  merging: 1,
  turnsAcross: 1,
  roundabouts: 1,
  complexJunctions: 1,
};

/** Selected triggers count extra, the rest a bit less, so the score feels personal. */
export function weightsFromSelection(selected: Trigger[]): TriggerWeights {
  if (selected.length === 0) return { ...NEUTRAL_WEIGHTS };
  const out = { ...NEUTRAL_WEIGHTS };
  for (const t of Object.keys(out) as Trigger[]) {
    out[t] = selected.includes(t) ? 1.75 : 0.75;
  }
  return out;
}

export function selectedTriggers(weights: TriggerWeights): Trigger[] {
  return (Object.keys(weights) as Trigger[]).filter((t) => weights[t] > 1);
}
