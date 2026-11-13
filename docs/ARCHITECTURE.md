# How Calmway is built

One Expo (React Native) codebase for iOS, Android and the web. Everything that can be plain TypeScript is, so the important logic is tested without a phone.

```
src/
  app/                 Screens (Expo Router): map, search, settings, about, onboarding
  core/                Pure logic, no React, fully unit tested
    geo/               Polyline decoding, distances, snapping to a line, formatting
    calm-score/        Stress model, scoring and route ranking
    nav/               Route tracker, calm voice announcer, drive simulator
  services/            Network clients
    routing/           Valhalla client and the fastest / calm costing profiles
    geocoding/         Photon search, nearby categories, reverse geocoding
  features/            UI per feature: home, search, place, directions, navigation, ...
  components/
    map/               CalmMap: MapLibre Native on phones, maplibre-gl on the web
    ui/                Design system components
  store/               Zustand stores (prefs and places persist on the device)
  theme/               Tokens, light and dark palettes, the map style
```

## From a search to a calm route

1. **Search** (`services/geocoding/photon.ts`) returns places with their country code. The country decides which side of the road people drive on and which units the road signs use.
2. **Candidates** (`services/routing/valhalla.ts`) asks Valhalla for two things in parallel: the fastest routes (with alternatives) and a calm-tuned route. The calm costing lowers `use_highways`, raises `maneuver_penalty` so fewer turns win, and stays off tracks, service roads and unpaved roads. Near-identical routes are dropped by comparing their shapes.
3. **Score** (`core/calm-score/score.ts`) walks each route's maneuvers and adds stress points:

   | Event                                         | Points  |
   | --------------------------------------------- | ------- |
   | Joining a highway (merging into fast traffic) | 10      |
   | Highway interchange or lane change at speed   | 6       |
   | Explicit merge                                | 6       |
   | U-turn                                        | 5       |
   | Turn across oncoming traffic                  | 3.5     |
   | Roundabout (more for big ones)                | 2.5     |
   | Leaving a highway                             | 2.5     |
   | Two decisions less than 150 m apart           | 2       |
   | Fork or lane choice                           | 1.5     |
   | Easy turn                                     | 0.75    |
   | Every km on a highway / fast road             | 1 / 0.4 |

   Valhalla codes an on-ramp as an exit, a ramp, a merge or even a plain turn depending on the junction, so joining a highway is detected from the change in speed between stretches rather than from the maneuver type alone.

   Points are multiplied by the driver's own triggers (picked in onboarding), then normalised by the square root of the trip length into a 0 to 100 score where higher is calmer.

4. **Rank** (`core/calm-score/rank.ts`) labels the fastest route, the calmest route that fits in the extra time the driver accepts, and a balanced middle option when one exists. Each card shows the honest trade-off, like "+5 min, 16% calmer".

## Navigation

`features/navigation/useNavigationSession.ts` runs a drive:

- `core/nav/tracker.ts` snaps each GPS fix to the route (searching near the last position, so a road under a bridge does not confuse it), works out the next maneuver, the distance to it and the time left, and flags the driver as off route after a few fixes away from the line.
- `core/nav/announcer.ts` decides what to say. Tricky maneuvers get an early heads-up with a calming tip ("Match the speed of traffic and merge when it feels right"), every maneuver gets a prepare and a now line, and long quiet stretches get a short check-in.
- Going off route triggers a reroute with the same profile (calm stays calm), using the car's heading so it does not suggest turning around.
- `core/nav/simulator.ts` drives a virtual car along the route for Preview mode and for the tests.

## One map, two renderers

`components/map/CalmMap.tsx` (native) and `CalmMap.web.tsx` (web) share one props interface and the same GeoJSON sources and layer definitions from `components/map/layers.ts`, so routes, pins and the location dot look identical everywhere. The base map is OpenFreeMap's Positron layer set, recoloured to the app palette in `theme/map/mapStyle.ts`.

## Testing

```bash
npm run check     # typecheck, lint, tests
```

The tests in `src/core/__tests__` use recorded Valhalla responses (Amsterdam to Utrecht) to check parsing, scoring, ranking, tracking a full simulated drive, off-route detection and the order of spoken instructions.
