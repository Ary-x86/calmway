import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { useTheme } from '@/theme/ThemeProvider';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const { p } = useTheme();
  return <MaterialIcons name={name} size={size} color={color ?? p.ink} />;
}
