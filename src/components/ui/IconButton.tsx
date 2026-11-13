import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress?: () => void;
  size?: number;
  /** Floating buttons sit on the map with a soft shadow. */
  floating?: boolean;
  tone?: 'default' | 'primary' | 'subtle';
  style?: StyleProp<ViewStyle>;
  iconColor?: string;
}

export function IconButton({
  icon,
  label,
  onPress,
  size = 44,
  floating,
  tone = 'default',
  style,
  iconColor,
}: IconButtonProps) {
  const { p, scheme } = useTheme();
  const bg = tone === 'primary' ? p.primary : tone === 'subtle' ? p.surfaceSunken : p.surfaceRaised;
  const fg = iconColor ?? (tone === 'primary' ? p.onPrimary : p.ink);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
        floating && {
          boxShadow: scheme === 'dark' ? '0 4px 14px rgba(0, 0, 0, 0.45)' : '0 4px 14px rgba(27, 42, 44, 0.14)',
        },
        style,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
