"""Deterministic grouping definitions. All dynamic groups use earlier draws only."""

from collections import Counter
from dataclasses import dataclass
from functools import lru_cache
from math import ceil, comb


@dataclass(frozen=True)
class Rule:
    key: str
    title: str
    description: str
    category: str = "static"
    areas: tuple = ("front", "back")
    lookback: int = 0


RULES = (
    Rule("zone3", "三区分布", "前区按01–12、13–24、25–35分区；后区按01–04、05–08、09–12分区。"),
    Rule("zone5", "五区分布", "前区每7个号码一组，观察号码在五个区段中的集中与分散。", areas=("front",)),
    Rule("zone7", "七区分布", "前区每5个号码一组，用更细的区段观察局部集中。", areas=("front",)),
    Rule("parity", "奇偶分布", "按奇数、偶数分成两组，观察偏奇、偏偶和均衡形态。"),
    Rule("size", "大小分布", "前区01–17为小号、18–35为大号；后区01–06为小号、07–12为大号。"),
    Rule("path012", "012路", "按号码除以3的余数分为0路、1路、2路。"),
    Rule("mod5", "除5余数", "按号码除以5的余数分为0、1、2、3、4五组。"),
    Rule("tail10", "尾数分布", "按个位数分为0–9尾，观察同尾号码是否集中。"),
    Rule("digitsum", "数位和", "按十位与个位之和分组，例如08、17、26、35均属于数位和8。"),
    Rule("prime", "质合分布", "分为质数、合数、数字1三组；1单独列出，不归入质数或合数。"),
    Rule("repeat_neighbor", "重号与邻号", "以上一期为参照：重号为相同号码，邻号为±1且不属于重号，其余单列。", "recent", lookback=1),
    Rule("omission", "遗漏状态", "只用开奖前20期：遗漏0–2期为短遗漏，3–8期为中遗漏，9期及以上为长遗漏。", "recent", lookback=20),
    Rule("frequency", "近期冷热", "只用开奖前20期：前区出现≥4次、后区≥5次为热号；0–1次为冷号，其余为温号。", "recent", lookback=20),
)


def area_spec(area):
    if area not in ("front", "back"):
        raise ValueError("分析区域须为front或back")
    return (35, 5, "reds") if area == "front" else (12, 2, "blues")


def is_prime(number):
    return number >= 2 and all(number % divisor for divisor in range(2, int(number ** 0.5) + 1))


def make_groups(rule, area, earlier_draws):
    """earlier_draws is newest-first and must exclude the draw being evaluated."""
    maximum, _, field = area_spec(area)
    if area not in rule.areas or len(earlier_draws) < rule.lookback:
        return None
    numbers = list(range(1, maximum + 1))
    key = rule.key
    if key.startswith("zone"):
        width = ceil(maximum / int(key[-1]))
        return [
            {"label": f"{start:02d}–{min(start + width - 1, maximum):02d}",
             "numbers": numbers[start - 1:start + width - 1]}
            for start in range(1, maximum + 1, width)
        ]
    if key == "parity":
        buckets = [("奇数", [n for n in numbers if n % 2]), ("偶数", [n for n in numbers if not n % 2])]
    elif key == "size":
        midpoint = maximum // 2
        buckets = [("小号", numbers[:midpoint]), ("大号", numbers[midpoint:])]
    elif key in ("path012", "mod5", "tail10"):
        modulus = {"path012": 3, "mod5": 5, "tail10": 10}[key]
        suffix = {"path012": "路", "mod5": "余", "tail10": "尾"}[key]
        buckets = [(f"{remainder}{suffix}", [n for n in numbers if n % modulus == remainder]) for remainder in range(modulus)]
    elif key == "digitsum":
        sums = sorted({n // 10 + n % 10 for n in numbers})
        buckets = [(f"和{s}", [n for n in numbers if n // 10 + n % 10 == s]) for s in sums]
    elif key == "prime":
        buckets = [("质数", [n for n in numbers if is_prime(n)]), ("合数", [n for n in numbers if n > 1 and not is_prime(n)]), ("数字1", [1])]
    elif key == "repeat_neighbor":
        repeats = set(earlier_draws[0][field])
        neighbors = {n + offset for n in repeats for offset in (-1, 1) if 1 <= n + offset <= maximum} - repeats
        buckets = [("重号", sorted(repeats)), ("邻号", sorted(neighbors)), ("其余", sorted(set(numbers) - repeats - neighbors))]
    elif key == "omission":
        omissions = {n: next((i for i, draw in enumerate(earlier_draws[:20]) if n in draw[field]), 20) for n in numbers}
        buckets = [("短遗漏", [n for n in numbers if omissions[n] <= 2]), ("中遗漏", [n for n in numbers if 3 <= omissions[n] <= 8]), ("长遗漏", [n for n in numbers if omissions[n] >= 9])]
    elif key == "frequency":
        frequencies = Counter(n for draw in earlier_draws[:20] for n in draw[field])
        hot_minimum = 4 if area == "front" else 5
        buckets = [("热号", [n for n in numbers if frequencies[n] >= hot_minimum]), ("温号", [n for n in numbers if 2 <= frequencies[n] < hot_minimum]), ("冷号", [n for n in numbers if frequencies[n] <= 1])]
    else:
        raise ValueError(f"未知分组规则：{key}")
    return [{"label": label, "numbers": values} for label, values in buckets]


@lru_cache(maxsize=8192)
def retained_combinations(group_sizes, draw_size, threshold):
    """Exact coefficient of x^draw_size in product(sum(C(size,k)*x^k))."""
    coefficients = [1] + [0] * draw_size
    for size in group_sizes:
        next_coefficients = [0] * (draw_size + 1)
        for used in range(draw_size + 1):
            for take in range(min(size, threshold, draw_size - used) + 1):
                next_coefficients[used + take] += coefficients[used] * comb(size, take)
        coefficients = next_coefficients
    return coefficients[draw_size]


def distribution(numbers, groups):
    if groups is None:
        return None
    hits = [[n for n in group["numbers"] if n in numbers] for group in groups]
    counts = [len(values) for values in hits]
    return {
        "counts": counts,
        "groupHits": hits,
        "groupSizes": [len(group["numbers"]) for group in groups],
        "maxCluster": max(counts, default=0),
        "coverage": sum(value > 0 for value in counts),
        "pattern": ":".join(map(str, counts)),
    }
