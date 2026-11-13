import type { IconName } from '@/components/ui/Icon';
import type { Trigger } from '@/core/calm-score';

export const TRIGGER_ICON: Record<Trigger, IconName> = {
  highways: 'speed',
  merging: 'merge',
  turnsAcross: 'turn-left',
  roundabouts: 'roundabout-right',
  complexJunctions: 'call-split',
};
