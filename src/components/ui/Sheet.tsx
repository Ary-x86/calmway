import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export interface SheetProps {
  /** Visible heights in px, smallest first. */
  snapPoints: number[];
  index: number;
  onIndexChange?: (index: number) => void;
  /** Called with the settled height, so the map can keep content visible. */
  onHeightChange?: (height: number) => void;
  /** Drag area at the top. The handle is drawn above it. */
  header?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * A bottom sheet that snaps between heights, like the panel in most map apps.
 * Dragging happens on the header so lists inside can scroll freely.
 */
export function Sheet({ snapPoints, index, onIndexChange, onHeightChange, header, children, style }: SheetProps) {
  const { p, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const points = useMemo(() => snapPoints.map((h) => h + insets.bottom), [snapPoints, insets.bottom]);
  const [height] = useState(() => new Animated.Value(points[index] ?? points[0]));
  const current = useRef(points[index] ?? points[0]);
  const startHeight = useRef(0);
  const latest = useRef({ points, onIndexChange, onHeightChange });
  useLayoutEffect(() => {
    latest.current = { points, onIndexChange, onHeightChange };
  });

  // Plain function over refs and the stable Animated.Value, safe to call from gestures.
  const [animateTo] = useState(() => (target: number, i: number, notify: boolean) => {
    current.current = target;
    Animated.spring(height, {
      toValue: target,
      useNativeDriver: false,
      damping: 26,
      stiffness: 260,
      mass: 0.9,
    }).start();
    latest.current.onHeightChange?.(target);
    if (notify) latest.current.onIndexChange?.(i);
  });

  useEffect(() => {
    const target = points[Math.min(index, points.length - 1)];
    if (target !== undefined && target !== current.current) animateTo(target, index, false);
    else if (target !== undefined) latest.current.onHeightChange?.(target);
  }, [index, points, animateTo]);

  // The handlers only read refs when a gesture happens, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        startHeight.current = current.current;
      },
      onPanResponderMove: (_, g) => {
        const pts = latest.current.points;
        const next = Math.max(pts[0] - 40, Math.min(pts[pts.length - 1] + 20, startHeight.current - g.dy));
        height.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const pts = latest.current.points;
        const projected = startHeight.current - g.dy - g.vy * 180;
        let best = 0;
        pts.forEach((pt, i) => {
          if (Math.abs(pt - projected) < Math.abs(pts[best] - projected)) best = i;
        });
        animateTo(pts[best], best, true);
      },
    }),
  );

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height,
          backgroundColor: p.surface,
          paddingBottom: insets.bottom,
          boxShadow: scheme === 'dark' ? '0 -6px 24px rgba(0,0,0,0.5)' : '0 -6px 24px rgba(27, 42, 44, 0.10)',
        },
        style,
      ]}
    >
      <View {...responder.panHandlers} style={styles.dragArea}>
        <View accessibilityLabel="Drag to resize" style={[styles.handle, { backgroundColor: p.border }]} />
        {header}
      </View>
      <View style={styles.body}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  dragArea: { paddingTop: space.sm, paddingBottom: space.xs },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: space.sm },
  body: { flex: 1 },
});
