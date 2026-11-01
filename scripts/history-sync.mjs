import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { normalizeDraws, validateHistoryBundle } from '../src/lib/history.mjs';
import { JIANGSU_HISTORY_URL, parseJiangsuHistory } from './jiangsu-history.mjs';

export const PUBLISHED_HISTORY_URL = 'https://letou-group-lab.pages.dev/data/history.json';
const OFFICIAL_URL = 'https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sameDraws = (left, right) => JSON.stringify(left) === JSON.stringify(right);

async function readWithRetry(url, parseResponse, options, label) {
  const { fetchImpl = fetch, pause = sleep, attempts = 3 } = options;
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 3)
    throw new Error('重试次数须为1–3次。');
  let failure;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetchImpl(url, {
        headers: options.headers || { Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await parseResponse(response);
    } catch (error) {
      failure = error;
      if (attempt + 1 < attempts) await pause([2000, 6000][attempt]);
    }
  }
  throw new Error(`${label}读取失败（已尝试${attempts}次）：${failure?.message || '未知错误'}`);
}

function readJsonWithRetry(url, validate, options, label) {
  return readWithRetry(url, async response => validate(await response.json()), options, label);
}

export async function fetchOfficialHistory(options = {}) {
  const source = options.source || 'national';
  if (source === 'jiangsu') {
    return readWithRetry(JIANGSU_HISTORY_URL, async response => parseJiangsuHistory(await response.text()),
      {...options,headers:{Accept:'text/html',Referer:'https://api.js-lottery.com/wfzq/dlt/data'}}, '江苏体彩公开开奖表');
  }
  if (source !== 'national') throw new Error('数据来源只支持national或jiangsu。');
  const rows = [];
  for (let pageNo = 1; pageNo <= 3; pageNo++) {
    const url = new URL(OFFICIAL_URL);
    url.search = new URLSearchParams({gameNo:'85',provinceId:'0',isVerify:'1',pageNo:String(pageNo),pageSize:'100'}).toString();
    const page = await readJsonWithRetry(url, body => {
      if (body?.success !== true || !Array.isArray(body.value?.list) || !body.value.list.length)
        throw new Error('官方接口未返回有效开奖列表');
      return body.value.list;
    }, {...options,headers:{Accept:'application/json',Referer:'https://www.lottery.gov.cn/'}}, `官方开奖第${pageNo}页`);
    rows.push(...page);
  }
  return normalizeDraws(rows);
}

export function prepareHistoryUpdate(previousInput, freshInput, publishedInput = null, now = new Date().toISOString()) {
  const previous = validateHistoryBundle(previousInput);
  const published = publishedInput ? validateHistoryBundle(publishedInput) : null;
  const fresh = normalizeDraws(freshInput);
  if (fresh.length < 220) throw new Error('官方返回记录不足220期，保留原数据。');
  for (const baseline of [previous, published].filter(Boolean)) {
    const newest = baseline.draws[0];
    if (fresh[0].drawDate < newest.drawDate
      || (fresh[0].drawDate === newest.drawDate && Number(fresh[0].drawNum) < Number(newest.drawNum)))
      throw new Error('官方返回数据早于已有最新开奖，停止更新以防止回退。');
  }
  // Conflicting results for an existing issue require review instead of silently replacing it.
  const draws = normalizeDraws([...fresh, ...previous.draws.slice(0,300), ...(published?.draws.slice(0,300) || [])]).slice(0,300);
  let bundle;
  if (published && sameDraws(draws, published.draws)) bundle = published;
  else if (sameDraws(draws, previous.draws)) bundle = previous;
  else bundle = validateHistoryBundle({version:1,source:'official',updatedAt:now,draws});
  return {
    bundle,
    changed: JSON.stringify(bundle) !== JSON.stringify(previous),
    dataChanged: !sameDraws(draws, previous.draws),
    // Compare with production so a failed previous deployment is retried even if Git is current.
    deploymentRequired: published ? !sameDraws(draws, published.draws) : !sameDraws(draws, previous.draws),
  };
}

async function writeAtomically(target, bundle) {
  const path = target instanceof URL ? fileURLToPath(target) : target;
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, `${JSON.stringify(bundle, null, 2)}\n`, {encoding:'utf8',flag:'wx'});
    await rename(temp, path);
  } finally {
    await unlink(temp).catch(() => {});
  }
}

export async function syncHistory({target, comparePublished = false, dryRun = false, now, ...network}) {
  const previous = JSON.parse(await readFile(target, 'utf8'));
  validateHistoryBundle(previous);
  const fresh = await fetchOfficialHistory(network);
  let published = null;
  if (comparePublished) {
    const url = new URL(PUBLISHED_HISTORY_URL);
    url.searchParams.set('check', String(Date.now()));
    published = await readJsonWithRetry(url, validateHistoryBundle, network, '当前线上开奖数据');
  }
  const result = prepareHistoryUpdate(previous, fresh, published, now);
  if (result.changed && !dryRun) await writeAtomically(target, result.bundle);
  return result;
}
