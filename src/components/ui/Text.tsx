import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { type as typeScale, type Palette, type TextVariant } from '@/theme/tokens';

type Tone = 'ink' | 'muted' | 'faint' | 'primary' | 'accent' | 'inverse' | 'onPrimary';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: Tone;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

const toneColor = (p: Palette, tone: Tone) =>
  ({
    ink: p.ink,
    muted: p.inkMuted,
    faint: p.inkFaint,
    primary: p.primary,
    accent: p.accent,
    inverse: p.inkInverse,
    onPrimary: p.onPrimary,
  })[tone];

export function Text({ variant = 'body', tone = 'ink', color, align, style, ...rest }: TextProps) {
  const { p } = useTheme();
  const t = typeScale[variant];
  return (
    <RNText
      {...rest}
      style={[
        t,
        variant === 'overline' && { textTransform: 'uppercase' },
        { color: color ?? toneColor(p, tone), textAlign: align },
        style,
      ]}
    />
  );
}
