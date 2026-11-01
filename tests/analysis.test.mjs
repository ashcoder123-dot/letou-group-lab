import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeDraws, makeGroups, retainedCombinations } from '../src/lib/lottery-analysis.mjs';
import RULES from '../src/lib/rule-definitions.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const history = JSON.parse(readFileSync(path.join(root,'public','data','history.json'),'utf8')).draws;
const reference = spawnSync(process.env.LETOU_PYTHON || 'python', ['-B','-X','utf8',path.join(root,'tests','compare_reference.py')], {encoding: 'utf8', maxBuffer: 20_000_000});
assert.equal(reference.status,0,reference.stderr);
const cases = JSON.parse(reference.stdout);

function compare(actual, expected, where='root') {
  if (typeof expected === 'number') {
    assert.equal(typeof actual,'number',where);
    assert.ok(Math.abs(actual-expected) < 1e-10,`${where}: ${actual} != ${expected}`);
  } else if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual),where);
    assert.equal(actual.length,expected.length,where);
    for (let i=0;i<expected.length;i++) compare(actual[i],expected[i],`${where}[${i}]`);
  } else if (expected && typeof expected === 'object') {
    assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort(),where);
    for (const key of Object.keys(expected)) compare(actual[key],expected[key],`${where}.${key}`);
  } else assert.equal(actual,expected,where);
}

for (const item of cases) test(`Python parity: ${item.area}, ${item.limit} periods, ${item.historyCount} history records`, () => {
  compare(analyzeDraws(history.slice(0,item.historyCount),item.limit,item.area),item.report);
});

test('all cloud grouping rules form complete non-overlapping partitions', () => {
  for (const area of ['front','back']) for (const rule of RULES.filter(rule=>rule.areas.includes(area))) {
    const groups = makeGroups(rule,area,history.slice(0,20));
    assert.deepEqual(groups.flatMap(group=>group.numbers).sort((a,b)=>a-b),Array.from({length:area==='front'?35:12},(_,i)=>i+1));
  }
});

test('exact cloud baseline matches enumeration of all 66 back combinations', () => {
  for (const rule of RULES.filter(rule=>rule.areas.includes('back'))) {
    const groups = makeGroups(rule,'back',history.slice(0,20));
    let valid=0;
    for(let a=1;a<=11;a++)for(let b=a+1;b<=12;b++) if(groups.every(group=>Number(group.numbers.includes(a))+Number(group.numbers.includes(b))<=1))valid++;
    assert.equal(retainedCombinations(groups.map(group=>group.numbers.length),2,1),valid);
  }
});
