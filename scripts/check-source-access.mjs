import { readFile } from 'node:fs/promises';
import { validateHistoryBundle } from '../src/lib/history.mjs';

const history = validateHistoryBundle(JSON.parse(await readFile(new URL('../public/data/history.json',import.meta.url),'utf8')));
const issue = history.draws[0].drawNum;
const urls = [
  'https://www.fjtc.com.cn/node_309522.htm?gameType=f',
  'https://api.js-lottery.com/Lottery/_ListData?itemType=lo&pageIndex=1&pageSize=300',
  'https://www.gdlottery.cn/html/dlt/index.html',
  `https://www.gdlottery.cn/f_html/kjgg/P085_${issue}.html`,
];
for (const url of urls) {
  try {
    const response = await fetch(url, {signal:AbortSignal.timeout(12000)});
    const text = await response.text();
    const title = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
    console.log(JSON.stringify({url,status:response.status,title,bytes:Buffer.byteLength(text),
      expectedIssue:issue,currentIssuePresent:text.includes(issue),
      scripts:[...text.matchAll(/<script[^>]+src=["']([^"']+)/gi)].map(match=>match[1]).slice(-12)}));
  } catch (error) {
    console.log(JSON.stringify({url,error:error.message}));
  }
}
