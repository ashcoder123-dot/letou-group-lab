import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeDraws, validateHistoryBundle, historyMetadata } from '../src/lib/history.mjs';

const source = JSON.parse(readFileSync(new URL('../public/data/history.json', import.meta.url), 'utf8'));

test('published official snapshot is validated and sorted without adding draws', () => {
  const bundle = validateHistoryBundle(source);
  assert.equal(bundle.draws.length, source.draws.length);
  assert.deepEqual(bundle.draws, source.draws);
});

test('same issue with conflicting results is rejected', () => {
  const draw = source.draws[0];
  const changed = Array.from({length: 35}, (_, i) => i + 1).find(n => !draw.reds.includes(n));
  assert.throws(() => normalizeDraws([draw, { ...draw, reds: [changed, ...draw.reds.slice(1)] }]), /冲突/);
  assert.equal(normalizeDraws([draw, draw]).length, 1);
});

test('wrong counts, duplicate balls and out-of-range values cannot reach the analysis engine', () => {
  const draw = source.draws[0];
  for (const reds of [[1, 2], [1, 1, 2, 3, 4], [0, 2, 3, 4, 5], [1, 2, 3, 4, 36], ['1', 2, 3, 4, 5]])
    assert.throws(() => normalizeDraws([{...draw, reds}]), /校验失败/);
  assert.throws(() => normalizeDraws([{...draw, blues: [1, 13]}]), /校验失败/);
});

test('invalid dates, future draws and empty snapshots are rejected', () => {
  const draw = source.draws[0];
  for (const drawDate of ['2026-02-30', 'not-a-date', '9999-01-01'])
    assert.throws(() => normalizeDraws([{...draw, drawDate}]), /日期无效/);
  assert.throws(() => normalizeDraws([]), /数量/);
  assert.throws(() => normalizeDraws(Array(5001).fill(draw)), /数量/);
});

test('unrecognized data sources or malformed metadata are rejected', () => {
  for (const patch of [{source:'import'}, {version:2}, {updatedAt:'bad'}, {updatedAt:123}])
    assert.throws(() => validateHistoryBundle({...source, ...patch}), /格式无效/);
});

test('snapshot metadata keeps publication timestamp and warns when draw data gets old', () => {
  const bundle = validateHistoryBundle(source);
  const now = Date.parse(`${bundle.draws[0].drawDate}T23:59:59+08:00`);
  const current = historyMetadata(bundle, now);
  assert.equal(current.mode, 'snapshot');
  assert.equal(current.updatedAt, source.updatedAt);
  assert.equal(current.warning, null);
  const stale = historyMetadata(bundle, now + 5 * 86400_000);
  assert.equal(stale.isStale, true);
  assert.match(stale.warning, /暂未更新/);
  assert.equal(stale.updatedAt, source.updatedAt);
});

test('official API result format is accepted only after ball validation', () => {
  const draw = source.draws[0];
  const row = {lotteryDrawNum: draw.drawNum, lotteryDrawTime: draw.drawDate,
    lotteryDrawResult: [...draw.reds, ...draw.blues].map(n=>String(n).padStart(2,'0')).join(' ')};
  assert.deepEqual(normalizeDraws([row]), [draw]);
  assert.throws(() => normalizeDraws([{...row, lotteryDrawResult:'01 02 03'}]), /格式无效/);
});
