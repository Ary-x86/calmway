#!/usr/bin/env bash
# Renders every app icon, splash and favicon from the SVGs in assets/brand.
# Needs rsvg-convert (librsvg). Run with: npm run icons
set -euo pipefail
cd "$(dirname "$0")/.."
B=assets/brand
I=assets/images
P=public
mkdir -p "$I" "$P"

rsvg-convert -w 1024 -h 1024 "$B/logo-square.svg" -o "$I/icon.png"
rsvg-convert -w 1024 -h 1024 "$B/icon-foreground.svg" -o "$I/android-icon-foreground.png"
rsvg-convert -w 1024 -h 1024 "$B/icon-background.svg" -o "$I/android-icon-background.png"
rsvg-convert -w 1024 -h 1024 "$B/icon-monochrome.svg" -o "$I/android-icon-monochrome.png"
rsvg-convert -w 512 -h 512 "$B/logo.svg" -o "$I/splash-icon.png"
rsvg-convert -w 256 -h 256 "$B/logo.svg" -o "$I/logo.png"
rsvg-convert -w 48 -h 48 "$B/logo.svg" -o "$I/favicon.png"
rsvg-convert -w 192 -h 192 "$B/logo.svg" -o "$P/icon-192.png"
rsvg-convert -w 512 -h 512 "$B/logo.svg" -o "$P/icon-512.png"
rsvg-convert -w 180 -h 180 "$B/logo-square.svg" -o "$P/apple-touch-icon.png"
echo "Icons written to $I and $P"
