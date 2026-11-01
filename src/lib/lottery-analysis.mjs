import RULES from './rule-definitions.mjs';

export function areaSpec(area) {
  if (area !== 'front' && area !== 'back') throw new Error('分析区域须为front或back');
  return area === 'front' ? [35, 5, 'reds'] : [12, 2, 'blues'];
}

const range = (start, end) => Array.from({length: Math.max(0, end - start)}, (_, i) => start + i);
const isPrime = n => n >= 2 && range(2, Math.floor(Math.sqrt(n)) + 1).every(d => n % d !== 0);
export function makeGroups(rule, area, earlierDraws) {
  const [maximum, , field] = areaSpec(area);
  if (!rule.areas.includes(area) || earlierDraws.length < rule.lookback) return null;
  const numbers = range(1, maximum + 1);
  const key = rule.key;
  let buckets;
  if (key.startsWith('zone')) {
    const width = Math.ceil(maximum / Number(key.at(-1)));
    return range(0, Math.ceil(maximum / width)).map(i => {
      const start = i * width + 1;
      return {label: `${String(start).padStart(2,'0')}–${String(Math.min(start + width - 1, maximum)).padStart(2,'0')}`, numbers: numbers.slice(start - 1, start + width - 1)};
    });
  }
  if (key === 'parity') buckets = [['奇数', numbers.filter(n => n % 2)], ['偶数', numbers.filter(n => !(n % 2))]];
  else if (key === 'size') {
    const middle = Math.floor(maximum / 2);
    buckets = [['小号', numbers.slice(0, middle)], ['大号', numbers.slice(middle)]];
  } else if (['path012', 'mod5', 'tail10'].includes(key)) {
    const modulus = {path012: 3, mod5: 5, tail10: 10}[key];
    const suffix = {path012: '路', mod5: '余', tail10: '尾'}[key];
    buckets = range(0, modulus).map(remainder => [`${remainder}${suffix}`, numbers.filter(n => n % modulus === remainder)]);
  } else if (key === 'digitsum') {
    const sum = n => Math.floor(n / 10) + n % 10;
    const sums = [...new Set(numbers.map(sum))].sort((a,b) => a-b);
    buckets = sums.map(s => [`和${s}`, numbers.filter(n => sum(n) === s)]);
  } else if (key === 'prime') buckets = [['质数', numbers.filter(isPrime)], ['合数', numbers.filter(n => n > 1 && !isPrime(n))], ['数字1', [1]]];
  else if (key === 'repeat_neighbor') {
    const repeats = new Set(earlierDraws[0][field]);
    const neighbors = new Set([...repeats].flatMap(n => [n - 1, n + 1]).filter(n => n >= 1 && n <= maximum && !repeats.has(n)));
    buckets = [['重号', numbers.filter(n => repeats.has(n))], ['邻号', numbers.filter(n => neighbors.has(n))], ['其余', numbers.filter(n => !repeats.has(n) && !neighbors.has(n))]];
  } else if (key === 'omission') {
    const omissions = new Map(numbers.map(n => { const i = earlierDraws.slice(0,20).findIndex(draw => draw[field].includes(n)); return [n, i < 0 ? 20 : i]; }));
    buckets = [['短遗漏', numbers.filter(n => omissions.get(n) <= 2)], ['中遗漏', numbers.filter(n => omissions.get(n) >= 3 && omissions.get(n) <= 8)], ['长遗漏', numbers.filter(n => omissions.get(n) >= 9)]];
  } else if (key === 'frequency') {
    const counts = new Map(numbers.map(n => [n, earlierDraws.slice(0,20).filter(draw => draw[field].includes(n)).length]));
    const hot = area === 'front' ? 4 : 5;
    buckets = [['热号', numbers.filter(n => counts.get(n) >= hot)], ['温号', numbers.filter(n => counts.get(n) >= 2 && counts.get(n) < hot)], ['冷号', numbers.filter(n => counts.get(n) <= 1)]];
  } else throw new Error(`未知分组规则：${key}`);
  return buckets.map(([label, values]) => ({label, numbers: values}));
}

function comb(n,k) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i=1; i<=k; i++) result = result * (n-i+1) / i;
  return result;
}
const countCache = new Map();
export function retainedCombinations(sizes, drawSize, threshold) {
  const key = `${drawSize}|${threshold}|${sizes.join(',')}`;
  if (countCache.has(key)) return countCache.get(key);
  let coefficients = [1, ...Array(drawSize).fill(0)];
  for (const size of sizes) {
    const next = Array(drawSize + 1).fill(0);
    for (let used=0; used<=drawSize; used++) {
      for (let take=0; take<=Math.min(size,threshold,drawSize-used); take++) next[used+take] += coefficients[used] * comb(size,take);
    }
    coefficients = next;
  }
  if (countCache.size >= 8192) countCache.clear();
  countCache.set(key, coefficients[drawSize]);
  return coefficients[drawSize];
}

function distribution(numbers, groups) {
  if (!groups) return null;
  const hits = groups.map(group => group.numbers.filter(n => numbers.includes(n)));
  const counts = hits.map(values => values.length);
  return {counts, groupHits: hits, groupSizes: groups.map(group => group.numbers.length), maxCluster: Math.max(0,...counts), coverage: counts.filter(Boolean).length, pattern: counts.join(':')};
}

function interval(passed, total) {
  if (!total) return [null,null];
  const z = 1.959963984540054;
  const p = passed / total;
  const denominator = 1 + z*z / total;
  const center = (p + z*z / (2*total)) / denominator;
  const margin = z * Math.sqrt(p*(1-p)/total + z*z/(4*total*total)) / denominator;
  return [Math.max(0,center-margin),Math.min(1,center+margin)];
}

function summarize(observations, threshold, maximum, drawSize) {
  const total = observations.length;
  const passed = observations.filter(item => item.maxCluster <= threshold).length;
  const baseline = total ? observations.reduce((sum,item) => sum + retainedCombinations(item.groupSizes,drawSize,threshold) / comb(maximum,drawSize),0) / total : null;
  const retention = total ? passed / total : null;
  const [low,high] = interval(passed,total);
  return {sampleCount: total, retainedCount: passed, retention, baseline, lift: total ? retention-baseline : null, confidenceLow: low, confidenceHigh: high};
}

function numberMetrics(numbers) {
  const differences = new Set(numbers.flatMap((n,i) => numbers.slice(i+1).map(right => Math.abs(right-n))));
  return {sum: numbers.reduce((a,b) => a+b,0), span: numbers.at(-1)-numbers[0], oddCount: numbers.filter(n => n%2).length, ac: differences.size-(numbers.length-1), consecutivePairs: numbers.slice(1).filter((n,i) => n-numbers[i] === 1).length};
}

export function analyzeDraws(draws, limit=100, area='front') {
  const [maximum,drawSize,field] = areaSpec(area);
  const selected = draws.slice(0,limit);
  const validationSize = Math.ceil(selected.length*0.3);
  const definitions = RULES.filter(rule => rule.areas.includes(area));
  const records = selected.map((draw,index) => {
    const prior = draws.slice(index+1,index+21);
    return {...draw, segment: index < validationSize ? 'validation' : 'training', metrics: numberMetrics(draw[field]), distributions: Object.fromEntries(definitions.map(rule => [rule.key,distribution(draw[field],makeGroups(rule,area,prior))]))};
  });
  const reports = definitions.map(rule => {
    const training = records.slice(validationSize).map(row => row.distributions[rule.key]).filter(Boolean);
    const validation = records.slice(0,validationSize).map(row => row.distributions[rule.key]).filter(Boolean);
    const observations = training.concat(validation);
    const candidates = range(1,drawSize+1).map(threshold => ({threshold, training: summarize(training,threshold,maximum,drawSize), validation: summarize(validation,threshold,maximum,drawSize), overall: summarize(observations,threshold,maximum,drawSize)}));
    const eligible = candidates.filter(candidate => candidate.training.baseline != null && candidate.training.baseline >= 0.1 && candidate.training.baseline <= 0.95);
    const nextGroups = makeGroups(rule,area,draws.slice(0,20));
    const fallback = Math.min((nextGroups?.length || 0)>3 ? 2 : 3,drawSize);
    let chosen = eligible[0] || candidates[fallback-1];
    for (const candidate of eligible.slice(1)) {
      const delta = candidate.training.confidenceLow-candidate.training.baseline;
      const current = chosen.training.confidenceLow-chosen.training.baseline;
      if (delta > current || (delta === current && candidate.training.baseline < chosen.training.baseline)) chosen = candidate;
    }
    const retained = nextGroups ? retainedCombinations(nextGroups.map(group => group.numbers.length),drawSize,chosen.threshold) : null;
    const theoretical = retained == null ? null : retained / comb(maximum,drawSize);
    const enough = eligible.length > 0 && training.length >= 10 && validation.length >= 10;
    const status = !enough ? 'insufficient' : chosen.validation.confidenceLow > chosen.validation.baseline ? 'above_baseline' : 'observe';
    const patterns = new Map();
    for (const item of observations) patterns.set(item.pattern,(patterns.get(item.pattern)||0)+1);
    return {key: rule.key, title: rule.title, description: rule.description, category: rule.category, lookback: rule.lookback,
      threshold: chosen.threshold, condition: `单组最多${chosen.threshold}个`, conditionSource: eligible.length ? 'training' : 'preset',
      training: chosen.training, validation: chosen.validation, overall: chosen.overall, status, nextGroups,
      nextBaseline: theoretical, compression: theoretical == null ? null : 1-theoretical,
      retainedCombinations: retained, totalCombinations: comb(maximum,drawSize),
      patterns: [...patterns].sort((a,b) => b[1]-a[1]).map(([pattern,count]) => ({pattern,count,percentage: count/observations.length})), candidates};
  });
  reports.sort((a,b) => {
    const enough = Number(b.status !== 'insufficient') - Number(a.status !== 'insufficient');
    if (enough) return enough;
    const score = item => item.validation.baseline == null ? -2 : item.validation.confidenceLow-item.validation.baseline;
    return score(b)-score(a);
  });
  const stats = range(1,maximum+1).map(n => {
    const index = selected.findIndex(draw => draw[field].includes(n));
    return {number: n, frequency: selected.filter(draw => draw[field].includes(n)).length, omission: index < 0 ? selected.length : index, omissionCensored: index < 0};
  });
  return {area, requestedCount: limit, sampleCount: selected.length, trainingCount: selected.length-validationSize, validationCount: validationSize,
    latestDraw: selected[0] || null, oldestDraw: selected.at(-1) || null, ruleCount: reports.length, rules: reports, draws: records, numberStats: stats,
    methodology: {trainingRatio: 0.7, minimumSegmentSamples: 10,
      comparison: '按验证段保留率区间下界与同期理论基线之差排序。',
      selection: '仅用较早70%选择单组上限；较近30%用于验证。动态分组只读取当期开奖前的数据。',
      baseline: '根据各组容量，用组合计数精确计算均匀随机组合的保留比例。动态规则逐期计算后取平均。',
      interpretation: '历史保留率是开奖号码未被条件排除的比例，不是中奖率；对多种规律的比较仍需后续新开奖验证。'}};
}
