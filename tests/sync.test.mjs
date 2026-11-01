import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, readdir } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fetchOfficialHistory, prepareHistoryUpdate, syncHistory } from '../scripts/history-sync.mjs';

const snapshot = JSON.parse(await readFile(new URL('../public/data/history.json', import.meta.url), 'utf8'));
const older = {...snapshot, draws:snapshot.draws.slice(1)};
const freshTime = '2026-11-01T01:17:00.000Z';
async function removeFixtureDir(dir) {
  assert.equal(dirname(resolve(dir)), resolve(tmpdir()));
  assert.ok(basename(dir).startsWith('letou-sync-'));
  await rm(dir, {recursive:true,force:true});
}
const fixtureFetch = async url => {
  const parsed = new URL(url);
  if (parsed.hostname === 'letou-group-lab.pages.dev') return Response.json(snapshot);
  const offset = (Number(parsed.searchParams.get('pageNo')) - 1) * 100;
  return Response.json({success:true,value:{list:snapshot.draws.slice(offset,offset+100)}});
};

test('same draws do not change the snapshot timestamp or require a deployment', () => {
  const result = prepareHistoryUpdate(snapshot, snapshot.draws, snapshot, freshTime);
  assert.equal(result.changed, false);
  assert.equal(result.deploymentRequired, false);
  assert.equal(result.bundle.updatedAt, snapshot.updatedAt);
});

test('a new real draw updates both the local snapshot and deployment decision', () => {
  const result = prepareHistoryUpdate(older, snapshot.draws, older, freshTime);
  assert.equal(result.changed, true);
  assert.equal(result.deploymentRequired, true);
  assert.equal(result.bundle.draws.length, 300);
  assert.equal(result.bundle.updatedAt, freshTime);
  assert.deepEqual(result.bundle.draws[0], snapshot.draws[0]);
});

test('a failed prior deployment is retried even when Git already has the newest draw', () => {
  const result = prepareHistoryUpdate(snapshot, snapshot.draws, older, freshTime);
  assert.equal(result.changed, false);
  assert.equal(result.deploymentRequired, true);
});

test('an outdated repository catches up with production without republishing', () => {
  const result = prepareHistoryUpdate(older, snapshot.draws, snapshot, freshTime);
  assert.equal(result.changed, true);
  assert.equal(result.deploymentRequired, false);
  assert.equal(result.bundle.updatedAt, snapshot.updatedAt);
});

test('regression behind local or production data is rejected', () => {
  assert.throws(() => prepareHistoryUpdate(snapshot, older.draws, null, freshTime), /回退/);
  assert.throws(() => prepareHistoryUpdate(older, older.draws, snapshot, freshTime), /回退/);
});

test('incomplete pages or conflicting historical results cannot overwrite the snapshot', () => {
  assert.throws(() => prepareHistoryUpdate(snapshot, snapshot.draws.slice(0,100)), /不足220/);
  const conflict = structuredClone(snapshot.draws);
  const replacement = Array.from({length:35},(_,i)=>i+1).find(n=>!conflict[1].reds.includes(n));
  conflict[1].reds[0] = replacement;
  assert.throws(() => prepareHistoryUpdate(snapshot, conflict), /冲突/);
});

test('transient upstream failures are retried with a finite backoff', async () => {
  let calls = 0;
  const delays = [];
  const draws = await fetchOfficialHistory({
    fetchImpl: async url => ++calls === 1 ? new Response('', {status:567}) : fixtureFetch(url),
    pause: async ms => delays.push(ms),
  });
  assert.equal(calls, 4);
  assert.deepEqual(delays, [2000]);
  assert.deepEqual(draws, snapshot.draws);
});

test('persistent upstream failure stops after three attempts', async () => {
  let calls = 0;
  const delays = [];
  await assert.rejects(fetchOfficialHistory({
    fetchImpl: async () => { ++calls; return new Response('', {status:503}); },
    pause: async ms => delays.push(ms),
  }), /已尝试3次.*503/);
  assert.equal(calls, 3);
  assert.deepEqual(delays, [2000,6000]);
});

test('JSON errors and official business errors are not mistaken for successful draws', async () => {
  for (const response of [new Response('<html>blocked</html>'), Response.json({success:false,value:{list:snapshot.draws}})]) {
    await assert.rejects(fetchOfficialHistory({fetchImpl:async()=>response,attempts:1}));
  }
});

test('no-change sync leaves the original file byte-for-byte unchanged', async t => {
  const dir = await mkdtemp(join(tmpdir(),'letou-sync-'));
  t.after(() => removeFixtureDir(dir));
  const target = join(dir,'history.json');
  const original = JSON.stringify(snapshot);
  await writeFile(target, original);
  const result = await syncHistory({target,comparePublished:true,fetchImpl:fixtureFetch,now:freshTime});
  assert.equal(result.changed, false);
  assert.equal(await readFile(target,'utf8'), original);
});

test('failed fetch or production comparison never replaces the original file', async t => {
  const dir = await mkdtemp(join(tmpdir(),'letou-sync-'));
  t.after(() => removeFixtureDir(dir));
  const target = join(dir,'history.json');
  const original = JSON.stringify(older);
  await writeFile(target,original);
  await assert.rejects(syncHistory({target,fetchImpl:async()=>new Response('',{status:503}),attempts:1}));
  assert.equal(await readFile(target,'utf8'), original);
  await assert.rejects(syncHistory({target,comparePublished:true,attempts:1,fetchImpl:async url =>
    new URL(url).hostname === 'letou-group-lab.pages.dev' ? new Response('',{status:403}) : fixtureFetch(url)}));
  assert.equal(await readFile(target,'utf8'), original);
  assert.deepEqual(await readdir(dir), ['history.json']);
});

test('dry run does not write; successful update writes one validated snapshot atomically', async t => {
  const dir = await mkdtemp(join(tmpdir(),'letou-sync-'));
  t.after(() => removeFixtureDir(dir));
  const target = join(dir,'history.json');
  const original = JSON.stringify(older);
  await writeFile(target,original);
  const plan = await syncHistory({target,dryRun:true,fetchImpl:fixtureFetch,now:freshTime});
  assert.equal(plan.changed, true);
  assert.equal(await readFile(target,'utf8'), original);
  await syncHistory({target,fetchImpl:fixtureFetch,now:freshTime});
  const actual = JSON.parse(await readFile(target,'utf8'));
  assert.deepEqual(actual.draws, snapshot.draws);
  assert.equal(actual.updatedAt, freshTime);
  assert.deepEqual(await readdir(dir), ['history.json']);
});
