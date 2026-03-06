"""Budget planner — compare budget limits against actual spending per category."""

from __future__ import annotations


def analyze_budget(
    budget_limits: dict[str, float],
    actual_spending: dict[str, float],
) -> dict:
    """Compare actual spending to budget limits.

    Args:
        budget_limits:   Mapping of category → monthly budget amount ($).
        actual_spending: Mapping of category → actual amount spent ($).

    Returns a dict containing:
        categories        – per-category breakdown (budget, actual, remaining, pct_used, status)
        total_budget      – sum of all budget limits
        total_actual      – sum of all actual spending
        total_remaining   – total_budget - total_actual
        over_budget_categories – categories where actual > budget
        savings_rate_pct  – percentage of total budget *not* spent (≥ 0)
    """
    all_categories = sorted(set(budget_limits) | set(actual_spending))

    results: dict[str, dict] = {}
    for cat in all_categories:
        budget = float(budget_limits.get(cat, 0.0))
        actual = float(actual_spending.get(cat, 0.0))
        remaining = budget - actual

        if budget > 0:
            pct_used = actual / budget * 100
        else:
            # No budget set but money was spent → unplanned, treat as over-budget
            pct_used = 101.0 if actual > 0 else 0.0

        if pct_used <= 75:
            status = "ok"
        elif pct_used <= 100:
            status = "warning"
        else:
            status = "over"

        results[cat] = {
            "budget": round(budget, 2),
            "actual": round(actual, 2),
            "remaining": round(remaining, 2),
            "pct_used": round(pct_used, 1),
            "status": status,
        }

    total_budget = sum(v["budget"] for v in results.values())
    total_actual = sum(v["actual"] for v in results.values())
    total_remaining = total_budget - total_actual
    savings_rate = max(total_remaining / total_budget * 100, 0.0) if total_budget > 0 else 0.0

    return {
        "categories": results,
        "total_budget": round(total_budget, 2),
        "total_actual": round(total_actual, 2),
        "total_remaining": round(total_remaining, 2),
        "over_budget_categories": [c for c, v in results.items() if v["status"] == "over"],
        "savings_rate_pct": round(savings_rate, 1),
    }
