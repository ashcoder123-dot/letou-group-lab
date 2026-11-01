import { normalizeDraws } from '../src/lib/history.mjs';

// Public pagination URL linked by https://api.js-lottery.com/wfzq/dlt/data.
export const JIANGSU_HISTORY_URL = 'https://api.js-lottery.com/Lottery/_ListData?itemType=lo&pageIndex=1&pageSize=300';

function cellText(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export function parseJiangsuHistory(html) {
  if (typeof html !== 'string' || html.length > 2_000_000) throw new Error('江苏体彩开奖表内容无效。');
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(match => [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => cellText(cell[1])));
  const header = rows.shift();
  if (!header || !['发布日期','开奖日期'].includes(header[0]) || header[1] !== '期号' || header[2] !== '开奖号码')
    throw new Error('江苏体彩开奖表结构变化，请核对官方页面。');
  const draws = rows.map(cells => {
    if (cells.length !== 4 || !/^\d{4}-\d{2}-\d{2}$/.test(cells[0]) || !/^\d{5,7}$/.test(cells[1]))
      throw new Error('江苏体彩开奖表包含无效日期或期号。');
    const numbers = cells[2].split(/\s+/);
    if (numbers.length !== 7 || numbers.some(n => !/^\d{1,2}$/.test(n)))
      throw new Error('江苏体彩开奖表号码格式无效。');
    return {drawNum:cells[1],drawDate:cells[0],reds:numbers.slice(0,5).map(Number),blues:numbers.slice(5).map(Number)};
  });
  const normalized = normalizeDraws(draws);
  if (normalized.length < 220) throw new Error('江苏体彩返回记录不足220期，停止更新。');
  return normalized;
}
