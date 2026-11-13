import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  floating?: boolean;
}

export function Chip({ label, icon, selected, onPress, floating }: ChipProps) {
  const { p, scheme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? p.primary : p.surfaceRaised,
          borderColor: selected ? p.primary : p.border,
          opacity: pressed ? 0.85 : 1,
        },
        floating && {
          borderWidth: 0,
          boxShadow: scheme === 'dark' ? '0 2px 10px rgba(0,0,0,0.4)' : '0 2px 10px rgba(27, 42, 44, 0.10)',
        },
      ]}
    >
      {icon && <Icon name={icon} size={17} color={selected ? p.onPrimary : p.inkMuted} />}
      <Text variant="label" color={selected ? p.onPrimary : p.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    height: 36,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
