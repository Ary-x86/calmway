# Running, testing and releasing Calmway

## 1. Run it on your computer

```bash
npm install
npm run web
```

Open http://localhost:8081. To see it at phone size, open your browser's dev tools and switch on device mode (an iPhone or Pixel preset works well).

There is no GPS on a desktop, so:

- Tap the **From** field in directions and pick a starting point by search.
- Use **Preview** instead of **Start** to drive the route virtually. The preview bar lets you change the speed (1x, 4x, 8x) and take a **Wrong turn** on purpose to test rerouting.

## 2. Try it on your phone

### Quickest: the web app

The web app lives on GitHub Pages: **https://ary-x86.github.io/calmway/**

Open it on your phone and use "Add to Home Screen". It runs full screen, uses real GPS (the site is HTTPS) and speaks directions. Keep the screen on while driving.

### The real native app (development build)

Calmway uses MapLibre Native for smooth maps, so it needs a development build instead of Expo Go. Builds run in the cloud, so this works from Linux too.

```bash
npm install -g eas-cli        # or prefix every command with: npx eas-cli@latest
eas login                     # free Expo account
eas init                      # links this project to your account, run once

# Android: produces an APK you can install directly
eas build --profile development --platform android

# iPhone: needs an Apple Developer account ($99/year)
eas device:create             # register your iPhone, run once
eas build --profile development --platform ios
```

Install the build on your phone (EAS shows a QR code), then start the bundler and open the app:

```bash
npx expo start --dev-client
```

If you install Android Studio later, `npm run android` builds and runs it on an emulator or a USB-connected phone without the cloud.

## 3. Release to the stores

You need:

| Account                                                          | Cost         | For                     |
| ---------------------------------------------------------------- | ------------ | ----------------------- |
| [Expo](https://expo.dev/signup)                                  | free         | cloud builds and submit |
| [Apple Developer Program](https://developer.apple.com/programs/) | $99 per year | App Store               |
| [Google Play Console](https://play.google.com/console/signup)    | $25 once     | Play Store              |

```bash
eas build --profile production --platform all
eas submit --platform ios
eas submit --platform android
```

Before the first submission:

- Switch to production map services (next section). The free public servers are not meant for an app with real users.
- Write a privacy policy page. The About screen text is a good starting point: no account, no tracking, location stays on the device, only start and end points go to the routing service.
- Store screenshots: run the app in an iOS simulator or Android emulator through EAS, or take them from a development build on your phone.
- In App Store review notes, mention that location is only used in the foreground for navigation.

Ship JavaScript-only fixes without a new store review using `eas update`.

## 4. Map services and API keys

Out of the box Calmway uses free services that need no key:

| What    | Default                                      | Fine for launch?                         |
| ------- | -------------------------------------------- | ---------------------------------------- |
| Tiles   | [OpenFreeMap](https://openfreemap.org)       | Yes, free with no limits                 |
| Routing | Valhalla public server (FOSSGIS)             | No, fair use for testing only            |
| Search  | [Photon](https://photon.komoot.io) by komoot | No, fair use, heavy traffic is throttled |

Recommended for launch: **[Stadia Maps](https://stadiamaps.com)**. It runs the same Valhalla engine, so only the URL and a key change.

1. Create a Stadia Maps account and an API key. For the web build, add your GitHub Pages domain in their dashboard instead of using a key in the browser.
2. Set the environment variables (see `.env.example`):

   ```bash
   EXPO_PUBLIC_ROUTING_URL=https://api.stadiamaps.com/route/v1
   EXPO_PUBLIC_MAPS_API_KEY=your-key
   ```

3. For store builds, store them in EAS: `eas env:create --name EXPO_PUBLIC_MAPS_API_KEY --value your-key --environment production`. For the web build, add them as repository variables and pass them in `.github/workflows/web.yml`.

For search at scale, run your own Photon (one Docker container with a planet or country extract) and point `EXPO_PUBLIC_GEOCODER_URL` at it. Self-hosting Valhalla works the same way if you would rather not pay per request.

Optional: set `EXPO_PUBLIC_ORIGINAL_POST_URL` to the link of the post that inspired the app, and a "View the original post" link appears on the quote card.

## 5. Web hosting

The site is served from the `gh-pages` branch. There are two ways to update it, and both do the same thing: export the web build with the `/calmway` base path, run `scripts/prepare-pages.mjs`, and publish `dist/` to `gh-pages`.

- **From your computer:** `npm run deploy:web`
- **Automatically:** `.github/workflows/web.yml` runs on every push to `main`. This needs GitHub Actions to be available on your account. If runs fail with "account is locked due to a billing issue", fix that under GitHub Settings, Billing, or keep using `npm run deploy:web`.

`scripts/prepare-pages.mjs` exists because GitHub Pages will not serve files from a folder named `node_modules`, which is where Expo puts fonts and icons. It moves them to `assets/vendor` and adds a `404.html` so deep links like `/calmway/settings` work.

To use your own domain, add it under the repository's Settings, Pages, and drop `EXPO_BASE_URL` from the workflow and the `deploy:web` script.
