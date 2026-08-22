import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUILD_DIR = join(process.cwd(), 'build', 'assets');
const MAX_FIRST_PAINT_GZIP = 120 * 1024;
const MAX_REACT_VENDOR_GZIP = 60 * 1024;
const MAX_COMPARE_GZIP = 40 * 1024;

function gzipSize(path) {
  return gzipSync(readFileSync(path)).length;
}

function listAssets() {
  return readdirSync(BUILD_DIR)
    .filter((name) => /\.(js|css)$/.test(name))
    .map((name) => {
      const path = join(BUILD_DIR, name);
      return {
        name,
        path,
        raw: statSync(path).size,
        gzip: gzipSize(path),
      };
    });
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const assets = listAssets();
const reactVendor = assets.find((a) => a.name.includes('react-vendor') && a.name.endsWith('.js'));
const compareJs = assets.find((a) => /Compare/i.test(a.name) && a.name.endsWith('.js'));
const entryishJs = assets.filter(
  (a) => a.name.endsWith('.js') && !/Compare|CsvImport|ScenarioLibrary|brokerCsv/i.test(a.name),
);
const entryishCss = assets.filter(
  (a) => a.name.endsWith('.css') && !/compare/i.test(a.name),
);

const firstPaintGzip =
  entryishJs.reduce((sum, a) => sum + a.gzip, 0) +
  entryishCss.reduce((sum, a) => sum + a.gzip, 0);

console.log('Bundle gzip sizes:');
for (const asset of assets.sort((a, b) => b.gzip - a.gzip)) {
  console.log(`  ${asset.name}: ${formatKb(asset.gzip)} gzip (${formatKb(asset.raw)} raw)`);
}
console.log(`First-paint estimate (non-lazy JS+CSS): ${formatKb(firstPaintGzip)}`);

const failures = [];
if (reactVendor && reactVendor.gzip > MAX_REACT_VENDOR_GZIP) {
  failures.push(
    `react-vendor ${formatKb(reactVendor.gzip)} exceeds ${formatKb(MAX_REACT_VENDOR_GZIP)}`,
  );
}
if (firstPaintGzip > MAX_FIRST_PAINT_GZIP) {
  failures.push(
    `first-paint ${formatKb(firstPaintGzip)} exceeds ${formatKb(MAX_FIRST_PAINT_GZIP)}`,
  );
}
if (compareJs && compareJs.gzip > MAX_COMPARE_GZIP) {
  failures.push(`compare chunk ${formatKb(compareJs.gzip)} exceeds ${formatKb(MAX_COMPARE_GZIP)}`);
}

if (failures.length) {
  console.error('\nBundle budget failed:');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log('\nBundle budget OK.');
