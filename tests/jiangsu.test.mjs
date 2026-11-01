import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseJiangsuHistory, JIANGSU_HISTORY_URL } from '../scripts/jiangsu-history.mjs';
import { fetchOfficialHistory } from '../scripts/history-sync.mjs';

const snapshot = JSON.parse(await readFile(new URL('../public/data/history.json',import.meta.url),'utf8'));
function table(draws = snapshot.draws) {
  return '<table><tr><td>发布日期</td><td>期号</td><td>开奖号码</td><td>详细</td></tr>'
    + draws.map(draw=>`<tr><td>${draw.drawDate}</td><td>${draw.drawNum}</td><td>${[...draw.reds,...draw.blues].map(n=>String(n).padStart(2,'0')).join(' ')}</td><td><a>详细</a></td></tr>`).join('')
    + '</table>';
}

test('official public HTML table yields all original dates, issues and ball groups', () => {
  assert.deepEqual(parseJiangsuHistory(table()), snapshot.draws);
});

test('presentation whitespace, nested tags and nonbreaking spaces are accepted', () => {
  const firstNumbers = [...snapshot.draws[0].reds,...snapshot.draws[0].blues].map(n=>String(n).padStart(2,'0')).join(' ');
  const html = table().replaceAll('<td>','<td class="value">\n ')
    .replace(snapshot.draws[0].drawNum,`<span>${snapshot.draws[0].drawNum}</span>`)
    .replace(firstNumbers,firstNumbers.replace(' ','&nbsp;').replace(' ','&#160;'));
  assert.deepEqual(parseJiangsuHistory(html), snapshot.draws);
});

test('login/error pages and changed table headers are rejected', () => {
  for (const html of ['<html>temporarily unavailable</html>',table().replace('开奖号码','其他信息')])
    assert.throws(()=>parseJiangsuHistory(html),/结构变化/);
});

test('incomplete public tables cannot replace the full analysis history', () => {
  assert.throws(()=>parseJiangsuHistory(table(snapshot.draws.slice(0,10))),/不足220/);
});

test('wrong ball ranges, impossible dates and conflicting rows are rejected', () => {
  const bad = structuredClone(snapshot.draws);
  bad[0].blues[0] = 13;
  assert.throws(()=>parseJiangsuHistory(table(bad)),/校验失败/);
  assert.throws(()=>parseJiangsuHistory(table().replace(snapshot.draws[0].drawDate,'2026-02-30')),/日期无效/);
  assert.throws(()=>parseJiangsuHistory(table().replace([...snapshot.draws[0].reds,...snapshot.draws[0].blues].map(n=>String(n).padStart(2,'0')).join(' '),'01 02 03')),/号码格式/);
  const conflicting = structuredClone(snapshot.draws[0]);
  conflicting.reds[0] = Array.from({length:35},(_,i)=>i+1).find(n=>!conflicting.reds.includes(n));
  assert.throws(()=>parseJiangsuHistory(table([...snapshot.draws,conflicting])),/冲突/);
});

test('source selection fetches the public 300-row endpoint without using the blocked gateway', async () => {
  const calls = [];
  const actual = await fetchOfficialHistory({source:'jiangsu',fetchImpl:async (url, options)=>{
    calls.push({url:String(url),accept:options.headers.Accept});
    return new Response(table());
  }});
  assert.deepEqual(actual,snapshot.draws);
  assert.deepEqual(calls,[{url:JIANGSU_HISTORY_URL,accept:'text/html'}]);
});

test('an unavailable public source has bounded retries and returns no partial data', async () => {
  let calls = 0;
  await assert.rejects(fetchOfficialHistory({source:'jiangsu',pause:async()=>{},fetchImpl:async()=>{
    ++calls;
    return new Response('',{status:503});
  }}),/已尝试3次/);
  assert.equal(calls,3);
});

test('unknown source names are rejected before making a network request', async () => {
  let called = false;
  await assert.rejects(fetchOfficialHistory({source:'other',fetchImpl:async()=>{called=true;}}),/只支持/);
  assert.equal(called,false);
});
