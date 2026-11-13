import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CalmMapHandle, Padding } from '@/components/map/types';
import { IconButton } from '@/components/ui/IconButton';
import { Sheet } from '@/components/ui/Sheet';
import type { DriveSide } from '@/core/calm-score';
import type { UnitSystem } from '@/core/geo';
import type { Fix } from '@/core/nav';
import { useLayout } from '@/hooks/useLayout';
import type { RankedRoute } from '@/services/routing/types';
import { space } from '@/theme/tokens';
import { ManeuverBanner } from './ManeuverBanner';
import { NavFooter } from './NavFooter';
import { useNavigationSession } from './useNavigationSession';

export interface NavigationLayerProps {
  route: RankedRoute;
  simulate: boolean;
  driveSide: DriveSide;
  units: UnitSystem;
  map: RefObject<CalmMapHandle | null>;
  /** Set by the map screen when the user drags the map. */
  userMovedMap: number;
  onPosition: (fix: Fix | null) => void;
  onEnd: () => void;
}

/** Turn-by-turn mode: banner on top, ETA at the bottom, camera follows the car. */
export function NavigationLayer({
  route,
  simulate,
  driveSide,
  units,
  map,
  userMovedMap,
  onPosition,
  onEnd,
}: NavigationLayerProps) {
  const insets = useSafeAreaInsets();
  const { height, wide, panelWidth } = useLayout();
  const session = useNavigationSession(route, simulate, driveSide, units);
  const [following, setFollowing] = useState(true);
  const footerHeight = simulate ? 150 : 96;
  const snaps = useMemo(() => [footerHeight], [footerHeight]);
  const lastCamera = useRef(0);

  // The driver dragged the map: stop following until they tap re-center.
  const [seenMoves, setSeenMoves] = useState(userMovedMap);
  if (seenMoves !== userMovedMap) {
    setSeenMoves(userMovedMap);
    setFollowing(false);
  }

  useEffect(() => {
    onPosition(session.position);
  }, [session.position, onPosition]);

  useEffect(() => () => onPosition(null), [onPosition]);

  // Follow the car: look ahead, tilted, rotated to the direction of travel.
  useEffect(() => {
    const pos = session.position;
    if (!pos || !following) return;
    const now = Date.now();
    const sinceLast = now - lastCamera.current;
    lastCamera.current = now;
    const speed = pos.speed ?? 10;
    const zoom = speed > 25 ? 15.2 : speed > 15 ? 16 : 16.8;
    const padding: Padding = wide
      ? { top: height * 0.35, bottom: 40, left: panelWidth + 40, right: 40 }
      : { top: height * 0.42, bottom: footerHeight + insets.bottom + 20, left: 0, right: 0 };
    map.current?.easeTo({
      center: pos.coord,
      bearing: pos.heading ?? 0,
      pitch: 50,
      zoom,
      padding,
      duration: Math.min(1000, Math.max(200, sinceLast)),
    });
  }, [session.position, following, map, height, wide, panelWidth, footerHeight, insets.bottom]);

  const overview = () => {
    setFollowing(false);
    map.current?.fitBounds(
      route.bbox,
      wide
        ? { top: 160, bottom: 40, left: panelWidth + 60, right: 60 }
        : { top: insets.top + 200, bottom: footerHeight + insets.bottom + 40, left: 40, right: 40 },
    );
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.top, { top: insets.top + space.sm }, wide && { width: panelWidth, right: undefined }]}
      >
        <ManeuverBanner
          maneuvers={route.maneuvers}
          progress={session.progress}
          units={units}
          driveSide={driveSide}
          rerouting={session.rerouting}
        />
      </View>
      {!following && (
        <View
          style={[styles.recenter, { bottom: footerHeight + insets.bottom + space.lg }, wide && { bottom: 200 }]}
          pointerEvents="box-none"
        >
          <IconButton
            icon="navigation"
            label="Re-center"
            floating
            tone="primary"
            size={52}
            onPress={() => setFollowing(true)}
          />
        </View>
      )}
      <Sheet
        snapPoints={snaps}
        index={0}
        style={wide ? { left: space.lg, bottom: space.lg, width: panelWidth, borderRadius: 28 } : undefined}
      >
        <NavFooter
          route={route}
          progress={session.progress}
          session={session}
          simulate={simulate}
          units={units}
          onEnd={onEnd}
          onOverview={overview}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: space.lg, right: space.lg },
  recenter: { position: 'absolute', right: space.lg },
});
