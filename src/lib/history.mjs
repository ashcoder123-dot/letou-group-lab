const MAX_DRAWS = 5000;

export function normalizeDraws(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > MAX_DRAWS)
    throw new Error('开奖记录数量须为1–5000期。');
  const unique = new Map();
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') throw new Error('开奖记录格式无效。');
    const drawNum = String(raw.drawNum ?? raw.lotteryDrawNum ?? '');
    const drawDate = String(raw.drawDate ?? raw.lotteryDrawTime ?? '').slice(0, 10);
    if (!/^\d{5,7}$/.test(drawNum) || !/^\d{4}-\d{2}-\d{2}$/.test(drawDate)
      || !Number.isFinite(Date.parse(drawDate))
      || new Date(drawDate).toISOString().slice(0, 10) !== drawDate
      || drawDate > new Date().toISOString().slice(0, 10))
      throw new Error('开奖期号或日期无效。');
    const parts = typeof raw.lotteryDrawResult === 'string'
      ? raw.lotteryDrawResult.replaceAll('+', ' ').trim().split(/\s+/) : null;
    if (parts && (parts.length !== 7 || parts.some(n => !/^\d{1,2}$/.test(n))))
      throw new Error('官方开奖结果格式无效。');
    const reds = parts ? parts.slice(0, 5).map(Number) : raw.reds;
    const blues = parts ? parts.slice(5).map(Number) : raw.blues;
    for (const [numbers, count, maximum] of [[reds, 5, 35], [blues, 2, 12]]) {
      if (!Array.isArray(numbers) || numbers.length !== count
        || numbers.some(n => !Number.isInteger(n) || n < 1 || n > maximum)
        || new Set(numbers).size !== count)
        throw new Error('开奖号码数量、范围或唯一性校验失败。');
    }
    const draw = { drawNum, drawDate, reds: [...reds].sort((a, b) => a - b), blues: [...blues].sort((a, b) => a - b) };
    const previous = unique.get(drawNum);
    if (previous && JSON.stringify(previous) !== JSON.stringify(draw))
      throw new Error('同一期号包含冲突的开奖记录。');
    unique.set(drawNum, draw);
  }
  return [...unique.values()].sort((a, b) => b.drawDate.localeCompare(a.drawDate) || Number(b.drawNum) - Number(a.drawNum));
}

export function validateHistoryBundle(raw) {
  if (!raw || raw.version !== 1 || raw.source !== 'official'
    || typeof raw.updatedAt !== 'string' || !Number.isFinite(Date.parse(raw.updatedAt)))
    throw new Error('本站开奖数据格式无效，请稍后重新读取。');
  return { version: 1, source: 'official', updatedAt: raw.updatedAt, draws: normalizeDraws(raw.draws) };
}

export function historyMetadata(bundle, now = Date.now()) {
  const latest = bundle.draws[0];
  const isStale = now - Date.parse(`${latest.drawDate}T23:59:59+08:00`) > 4 * 86400_000;
  return {
    source: 'official', mode: 'snapshot', updatedAt: bundle.updatedAt, isStale,
    warning: isStale ? '本站开奖数据暂未更新，请核对截止期号和日期。' : null,
    storedCount: bundle.draws.length, latestDrawNum: latest.drawNum, latestDrawDate: latest.drawDate,
  };
}
