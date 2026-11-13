import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'soft' | 'outline' | 'ghost' | 'accent';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  /** Put the icon after the label, e.g. for a forward arrow. */
  iconRight?: boolean;
  variant?: Variant;
  size?: 'md' | 'lg' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  icon,
  iconRight,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  full,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { p } = useTheme();
  const colors: Record<Variant, { bg: string; bgPressed: string; fg: string; border?: string }> = {
    primary: { bg: p.primary, bgPressed: p.primaryPressed, fg: p.onPrimary },
    accent: { bg: p.accent, bgPressed: p.accent, fg: p.onAccent },
    soft: { bg: p.primarySoft, bgPressed: p.primarySoft, fg: p.primary },
    outline: { bg: 'transparent', bgPressed: p.surfaceSunken, fg: p.ink, border: p.border },
    ghost: { bg: 'transparent', bgPressed: p.surfaceSunken, fg: p.primary },
  };
  const c = colors[variant];
  const height = size === 'lg' ? 56 : size === 'sm' ? 36 : 46;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          paddingHorizontal: size === 'sm' ? space.md : space.xl,
          backgroundColor: pressed ? c.bgPressed : c.bg,
          borderColor: c.border ?? 'transparent',
          borderWidth: c.border ? 1 : 0,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        full && styles.full,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <View style={styles.row}>
          {icon && !iconRight && <Icon name={icon} size={size === 'sm' ? 18 : 20} color={c.fg} />}
          <Text variant={size === 'lg' ? 'bodyStrong' : 'label'} color={c.fg} numberOfLines={1}>
            {label}
          </Text>
          {icon && iconRight && <Icon name={icon} size={size === 'sm' ? 18 : 20} color={c.fg} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  full: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
