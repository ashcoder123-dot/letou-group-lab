"""Grouping research with chronological training/validation and exact baselines."""

from collections import Counter
from math import ceil, comb, sqrt

from rules import RULES, area_spec, distribution, make_groups, retained_combinations


def wilson_interval(passed, total):
    if not total:
        return None, None
    z = 1.959963984540054
    p = passed / total
    denominator = 1 + z * z / total
    center = (p + z * z / (2 * total)) / denominator
    margin = z * sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / denominator
    return max(0, center - margin), min(1, center + margin)


def summarize(observations, threshold, maximum, draw_size):
    count = len(observations)
    passed = sum(item["maxCluster"] <= threshold for item in observations)
    baseline = sum(retained_combinations(tuple(item["groupSizes"]), draw_size, threshold) / comb(maximum, draw_size) for item in observations) / count if count else None
    retention = passed / count if count else None
    low, high = wilson_interval(passed, count)
    return {"sampleCount": count, "retainedCount": passed, "retention": retention,
            "baseline": baseline, "lift": retention - baseline if count else None,
            "confidenceLow": low, "confidenceHigh": high}


def number_metrics(numbers):
    differences = {abs(right - left) for i, left in enumerate(numbers) for right in numbers[i + 1:]}
    return {"sum": sum(numbers), "span": numbers[-1] - numbers[0],
            "oddCount": sum(n % 2 for n in numbers),
            "ac": len(differences) - (len(numbers) - 1),
            "consecutivePairs": sum(b - a == 1 for a, b in zip(numbers, numbers[1:]))}


def analyze_draws(draws, limit=100, area="front"):
    maximum, draw_size, field = area_spec(area)
    selected = draws[:limit]
    validation_size = ceil(len(selected) * 0.3)
    definitions = [rule for rule in RULES if area in rule.areas]
    records = []
    for index, draw in enumerate(selected):
        prior = draws[index + 1:index + 21]
        records.append({**draw, "segment": "validation" if index < validation_size else "training",
                        "metrics": number_metrics(draw[field]),
                        "distributions": {rule.key: distribution(draw[field], make_groups(rule, area, prior)) for rule in definitions}})

    reports = []
    for rule in definitions:
        training = [row["distributions"][rule.key] for row in records[validation_size:] if row["distributions"][rule.key] is not None]
        validation = [row["distributions"][rule.key] for row in records[:validation_size] if row["distributions"][rule.key] is not None]
        all_observations = training + validation
        candidates = [{"threshold": threshold,
                       "training": summarize(training, threshold, maximum, draw_size),
                       "validation": summarize(validation, threshold, maximum, draw_size),
                       "overall": summarize(all_observations, threshold, maximum, draw_size)}
                      for threshold in range(1, draw_size + 1)]
        # Only the older training segment chooses the condition. Validation never
        # participates. Exclude impossible conditions and near-empty filtering.
        eligible = [candidate for candidate in candidates if candidate["training"]["baseline"] is not None and 0.1 <= candidate["training"]["baseline"] <= 0.95]
        chosen = max(eligible, key=lambda candidate: (candidate["training"]["confidenceLow"] - candidate["training"]["baseline"], -candidate["training"]["baseline"])) if eligible else candidates[min(2 if len(make_groups(rule, area, draws[:20]) or []) > 3 else 3, draw_size) - 1]
        threshold = chosen["threshold"]
        next_groups = make_groups(rule, area, draws[:20])
        retained = retained_combinations(tuple(len(group["numbers"]) for group in next_groups), draw_size, threshold) if next_groups is not None else None
        theoretical = retained / comb(maximum, draw_size) if retained is not None else None
        valid = chosen["validation"]
        enough = bool(eligible) and len(training) >= 10 and len(validation) >= 10
        status = "insufficient" if not enough else "above_baseline" if valid["confidenceLow"] > valid["baseline"] else "observe"
        patterns = Counter(item["pattern"] for item in all_observations)
        reports.append({"key": rule.key, "title": rule.title, "description": rule.description,
                        "category": rule.category, "lookback": rule.lookback,
                        "threshold": threshold, "condition": f"单组最多{threshold}个",
                        "conditionSource": "training" if eligible else "preset",
                        "training": chosen["training"], "validation": valid, "overall": chosen["overall"],
                        "status": status, "nextGroups": next_groups,
                        "nextBaseline": theoretical, "compression": 1 - theoretical if theoretical is not None else None,
                        "retainedCombinations": retained, "totalCombinations": comb(maximum, draw_size),
                        "patterns": [{"pattern": pattern, "count": count, "percentage": count / len(all_observations)} for pattern, count in patterns.most_common()],
                        "candidates": candidates})
    reports.sort(key=lambda item: (item["status"] != "insufficient", (item["validation"]["confidenceLow"] - item["validation"]["baseline"]) if item["validation"]["baseline"] is not None else -2), reverse=True)
    frequencies = Counter(n for draw in selected for n in draw[field])
    number_stats = [{"number": n, "frequency": frequencies[n], "omission": next((i for i, draw in enumerate(selected) if n in draw[field]), len(selected)), "omissionCensored": all(n not in draw[field] for draw in selected)} for n in range(1, maximum + 1)]
    return {"area": area, "requestedCount": limit, "sampleCount": len(selected),
            "trainingCount": len(selected) - validation_size, "validationCount": validation_size,
            "latestDraw": selected[0] if selected else None, "oldestDraw": selected[-1] if selected else None,
            "ruleCount": len(reports), "rules": reports, "draws": records, "numberStats": number_stats,
            "methodology": {"trainingRatio": 0.7, "minimumSegmentSamples": 10,
                            "comparison": "按验证段保留率区间下界与同期理论基线之差排序。",
                            "selection": "仅用较早70%选择单组上限；较近30%用于验证。动态分组只读取当期开奖前的数据。",
                            "baseline": "根据各组容量，用组合计数精确计算均匀随机组合的保留比例。动态规则逐期计算后取平均。",
                            "interpretation": "历史保留率是开奖号码未被条件排除的比例，不是中奖率；对多种规律的比较仍需后续新开奖验证。"}}
