"""Emit independent Python reference reports for the cloud parity tests."""
import json
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / "reference"))
from analysis import analyze_draws

history = json.loads((root / "public" / "data" / "history.json").read_text(encoding="utf-8"))["draws"]
cases = []
for area in ("front", "back"):
    for limit in (20, 30, 50, 100, 200):
        cases.append({"area": area, "limit": limit, "historyCount": len(history), "report": analyze_draws(history, limit, area)})
    for count in (1, 10, 20):
        cases.append({"area": area, "limit": 20, "historyCount": count, "report": analyze_draws(history[:count], 20, area)})
print(json.dumps(cases, ensure_ascii=False, separators=(",", ":")))
