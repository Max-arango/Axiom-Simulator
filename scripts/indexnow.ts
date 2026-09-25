/**
 * IndexNow — notifies Bing (and other IndexNow-compatible engines) about
 * updated URLs so they crawl immediately instead of waiting for the next
 * scheduled crawl.
 *
 * Usage (run after a production deploy):
 *   bun scripts/indexnow.ts
 *
 * Setup:
 * 1. Go to https://www.bing.com/indexnow and get your key
 * 2. Set INDEXNOW_KEY in .env.local
 * 3. Replace the content of public/<your-key>.txt with the key itself
 *    (rename the file to match the key)
 */

const KEY = process.env.INDEXNOW_KEY;
const HOST = "axiom-simulator.vercel.app";
const BASE = `https://${HOST}`;

if (!KEY) {
  console.error("INDEXNOW_KEY env var not set. Get your key at https://www.bing.com/indexnow");
  process.exit(1);
}

const URLS = [
  `${BASE}/`,
  `${BASE}/simulator`,
  `${BASE}/simulator/calculator`,
  `${BASE}/simulator/fractal`,
  `${BASE}/simulator/bloch`,
  `${BASE}/simulator/quantum`,
  `${BASE}/simulator/4d`,
  `${BASE}/simulator/topology`,
  `${BASE}/simulator/dynamics`,
  `${BASE}/simulator/dynamics-3d`,
  `${BASE}/simulator/life`,
  `${BASE}/simulator/inspector`,
  `${BASE}/simulator/notebook`,
  `${BASE}/simulator/docs`,
  `${BASE}/legal/terminos`,
  `${BASE}/legal/privacidad`,
  `${BASE}/legal/cookies`,
];

const body = {
  host: HOST,
  key: KEY,
  keyLocation: `${BASE}/${KEY}.txt`,
  urlList: URLS,
};

export {};

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

if (res.ok || res.status === 202) {
  console.log(`✓ IndexNow: submitted ${URLS.length} URLs (status ${res.status})`);
} else {
  const text = await res.text();
  console.error(`✗ IndexNow failed: ${res.status} ${text}`);
  process.exit(1);
}
