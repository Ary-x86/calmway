import { useWindowDimensions } from 'react-native';

export const PANEL_WIDTH = 400;

/** On wide screens (desktop browsers, tablets) panels float on the left like a sidebar. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  return { width, height, wide, panelWidth: wide ? PANEL_WIDTH : width };
}
