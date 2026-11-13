import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function ToggleRow({
  title,
  detail,
  icon,
  value,
  onChange,
}: {
  title: string;
  detail?: string;
  icon?: IconName;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { p } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      onPress={() => onChange(!value)}
      style={styles.row}
    >
      {icon && <Icon name={icon} size={22} color={value ? p.primary : p.inkMuted} />}
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        {detail && (
          <Text variant="caption" tone="muted">
            {detail}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: p.primary, false: p.border }}
        thumbColor="#FFFFFF"
        {...({ activeThumbColor: '#FFFFFF' } as object)}
      />
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { p } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={[styles.segmented, { backgroundColor: p.surfaceSunken }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[
              styles.segment,
              selected && { backgroundColor: p.surfaceRaised, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' },
            ]}
          >
            <Text variant="label" color={selected ? p.ink : p.inkMuted}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { p } = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="overline" tone="faint" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={[styles.sectionBody, { backgroundColor: p.surface, borderColor: p.border }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  flex: { flex: 1, gap: 2 },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 36, borderRadius: radius.pill },
  section: { gap: space.sm },
  sectionTitle: { paddingHorizontal: space.xs },
  sectionBody: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    gap: space.xs,
  },
});
