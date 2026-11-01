import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { validateHistoryBundle } from '../src/lib/history.mjs';

const root = new URL('../dist/', import.meta.url);
const files = await readdir(root, {recursive: true});
assert.ok(files.includes('index.html'), 'Missing built index.html');
assert.ok(!files.some(file => file === '_worker.js' || file.startsWith('functions/')), 'Server Functions must not be published');
const html = await readFile(new URL('index.html', root), 'utf8');
for (const [, asset] of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g))
  await readFile(new URL(`.${asset}`, root));
const scripts = files.filter(file => file.endsWith('.js'));
assert.ok(scripts.some(file => file.includes('analysis.worker-')), 'Missing browser analysis worker');
for (const file of scripts) {
  const text = await readFile(new URL(file.replaceAll('\\', '/'), root), 'utf8');
  assert.ok(!text.includes('/api/lottery/'), 'Built app must not call the old backend');
}
const bundle = validateHistoryBundle(JSON.parse(await readFile(new URL('data/history.json', root), 'utf8')));
const headers = await readFile(new URL('_headers', root), 'utf8');
assert.ok(headers.includes("frame-ancestors 'none'") && headers.includes("script-src 'self'"));
console.log(JSON.stringify({staticOnly:true,serverFunctions:0,files:files.length,
  historyCount:bundle.draws.length,latestDraw:bundle.draws[0].drawNum}));
