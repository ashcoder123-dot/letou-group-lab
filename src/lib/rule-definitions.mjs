export default [
  {
    "key": "zone3",
    "title": "三区分布",
    "description": "前区按01–12、13–24、25–35分区；后区按01–04、05–08、09–12分区。",
    "category": "static",
    "areas": [
      "front",
      "back"
    ],
    "lookback": 0
  },
  {
    "key": "zone5",
    "title": "五区分布",
    "description": "前区每7个号码一组，观察号码在五个区段中的集中与分散。",
    "category": "static",
    "areas": [
      "front"
    ],
    "lookback": 0
  },
  {
    "key": "zone7",
    "title": "七区分布",
    "description": "前区每5个号码一组，用更细的区段观察局部集中。",
    "category": "static",
    "areas": [
      "front"
    ],
    "lookback": 0
  },
  {
    "key": "parity",
    "title": "奇偶分布",
    "description": "按奇数、偶数分成两组，观察偏奇、偏偶和均衡形态。",
    "category": "static",
    "areas": [
      "front",
      "back"
    ],
    "lookback": 0
  },
  {
    "key": "size",
    "title": "大小分布",
    "description": "前区01–17为小号、18–35为大号；后区01–06为小号、07–12为大号。",
    "category": "static",
    "areas": [
      "front",
      "back"
    ],
    "lookback": 0
  },
  {
    "key": "path012",
    "title": "012路",
    "description": "按号码除以3的余数分为0路、1路、2路。",
    "category": "static",
    "areas": [
      "front",
      "back"
    ],
    "lookback": 0
  },
  {
    "key": "mod5",
    "title": "除5余数",
    "description": "按号码除以5的余数分为0、1、2、3、4五组。",
    "category": "static",
    "areas": [
      "front",
      "back"
    ],
    "lookback": 0
  },
  {
    "key": "tail10",
    "title": "尾数分布",
    "description": "按个位数分为0–9尾，观察同尾号码是否集中。",
    "category": "static",
    "areas": [
      "front",
      "back"
    ],
    "lookback": 0
  },
  {
    "key": "digitsum",
    "title": "数位和",
    "description": "按十位与个位之和分组，例如08、17、26、35均属于数位和8。",
    "category": "static",
    "areas": [
      "front",
      "back"
    ],
    "lookback": 0
  },
  {
    "key": "prime",
    "title": "质合分布",
    "description": "分为质数、合数、数字1三组；1单独列出，不归入质数或合数。",
    "category": "static",
    "areas": [
      "front",
      "back"
    ],
    "lookback": 0
  },
  {
    "key": "repeat_neighbor",
    "title": "重号与邻号",
    "description": "以上一期为参照：重号为相同号码，邻号为±1且不属于重号，其余单列。",
    "category": "recent",
    "areas": [
      "front",
      "back"
    ],
    "lookback": 1
  },
  {
    "key": "omission",
    "title": "遗漏状态",
    "description": "只用开奖前20期：遗漏0–2期为短遗漏，3–8期为中遗漏，9期及以上为长遗漏。",
    "category": "recent",
    "areas": [
      "front",
      "back"
    ],
    "lookback": 20
  },
  {
    "key": "frequency",
    "title": "近期冷热",
    "description": "只用开奖前20期：前区出现≥4次、后区≥5次为热号；0–1次为冷号，其余为温号。",
    "category": "recent",
    "areas": [
      "front",
      "back"
    ],
    "lookback": 20
  }
];
