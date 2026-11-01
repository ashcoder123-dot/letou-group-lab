import { readFile } from 'node:fs/promises';
import { validateHistoryBundle } from '../src/lib/history.mjs';
import { PUBLISHED_HISTORY_URL } from './history-sync.mjs';

const expected = validateHistoryBundle(JSON.parse(await readFile(new URL('../public/data/history.json', import.meta.url), 'utf8')));
let failure;
for (let attempt = 0; attempt < 6; attempt++) {
  try {
    const url = new URL(PUBLISHED_HISTORY_URL);
    url.searchParams.set('verify', `${Date.now()}-${attempt}`);
    const response = await fetch(url, {cache:'no-store',signal:AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error(`线上数据 HTTP ${response.status}`);
    const actual = validateHistoryBundle(await response.json());
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('线上数据尚未与本次发布一致');
    console.log(`已确认线上数据：第${actual.draws[0].drawNum}期 / ${actual.draws[0].drawDate}，共${actual.draws.length}期。`);
    failure = null;
    break;
  } catch (error) {
    failure = error;
    if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 3000));
  }
}
if (failure) {
  console.error(`线上验证失败：${failure.message}`);
  process.exitCode = 1;
}
