import type { RouteProfile } from './types';

/** How strongly the calm route steers away from stress. */
export type CalmStrength = 'gentle' | 'calm' | 'calmest';

export interface AvoidOptions {
  highways: boolean;
  tolls: boolean;
  ferries: boolean;
}

export interface ProfileRequest {
  profile: RouteProfile;
  costingOptions: Record<string, number | boolean>;
  alternates: number;
}

/**
 * Valhalla auto costing tuned for nerves.
 *
 * use_highways: 0 to 1, lower avoids motorways and their ramps and merges.
 * maneuver_penalty: seconds added per maneuver, higher prefers fewer turns.
 * use_living_streets / use_tracks: keep away from tiny or unpaved roads that
 *   are calm in theory but stressful in practice (pedestrians, no lines).
 */
const CALM_TUNING: Record<CalmStrength, { useHighways: number; maneuverPenalty: number }> = {
  gentle: { useHighways: 0.35, maneuverPenalty: 12 },
  calm: { useHighways: 0.15, maneuverPenalty: 22 },
  calmest: { useHighways: 0.02, maneuverPenalty: 35 },
};

function avoidOptions(avoid: AvoidOptions): Record<string, number | boolean> {
  const out: Record<string, number | boolean> = {};
  if (avoid.highways) out.use_highways = 0;
  if (avoid.tolls) out.use_tolls = 0;
  if (avoid.ferries) out.use_ferry = 0;
  return out;
}

export function buildProfiles(strength: CalmStrength, avoid: AvoidOptions): ProfileRequest[] {
  const tuning = CALM_TUNING[strength];
  return [
    {
      profile: 'fastest',
      alternates: 2,
      costingOptions: { ...avoidOptions(avoid) },
    },
    {
      profile: 'calm',
      alternates: 1,
      costingOptions: {
        use_highways: tuning.useHighways,
        maneuver_penalty: tuning.maneuverPenalty,
        use_tolls: 0.3,
        use_living_streets: 0.1,
        use_tracks: 0,
        service_penalty: 30,
        exclude_unpaved: true,
        ...avoidOptions(avoid),
      },
    },
  ];
}
