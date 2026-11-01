const urls = [
  'https://www.fjtc.com.cn/node_309522.htm?gameType=f',
  'https://api.js-lottery.com/wfzq/dlt/data',
  'https://www.gdlottery.cn/html/dlt/index.html',
  'https://www.gdlottery.cn/f_html/kjgg/P085_26124.html',
];
for (const url of urls) {
  try {
    const response = await fetch(url, {signal:AbortSignal.timeout(12000)});
    const text = await response.text();
    const title = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
    console.log(JSON.stringify({url,status:response.status,title,bytes:Buffer.byteLength(text),
      currentIssuePresent:text.includes('26124'),
      scripts:[...text.matchAll(/<script[^>]+src=["']([^"']+)/gi)].map(match=>match[1]).slice(-12)}));
  } catch (error) {
    console.log(JSON.stringify({url,error:error.message}));
  }
}
