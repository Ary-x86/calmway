// Prepares the exported web build in dist/ for GitHub Pages.
//
// 1. GitHub Pages will not serve anything under a folder named node_modules,
//    which is where Expo puts fonts and icons from packages. Move them to
//    assets/vendor and point the bundles at the new place.
// 2. Copy index.html to 404.html so deep links like /calmway/settings load
//    the app instead of a GitHub error page.
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const from = join(dist, 'assets', 'node_modules');
const to = join(dist, 'assets', 'vendor');

if (existsSync(from)) renameSync(from, to);

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(js|html|json|css)$/.test(name)) {
      const text = readFileSync(path, 'utf8');
      if (text.includes('assets/node_modules/')) {
        writeFileSync(path, text.replaceAll('assets/node_modules/', 'assets/vendor/'));
      }
    }
  }
}
walk(dist);

cpSync(join(dist, 'index.html'), join(dist, '404.html'));
console.log('dist/ is ready for GitHub Pages');
