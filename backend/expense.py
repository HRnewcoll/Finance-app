"""Expense categoriser (keyword-based) and simple forecaster (linear regression)."""

from __future__ import annotations

import re
from typing import Any

import numpy as np


# ---------------------------------------------------------------------------
# Keyword rules – ordered from most specific to least specific
# ---------------------------------------------------------------------------
_CATEGORY_RULES: list[tuple[str, list[str]]] = [
    ("Housing",       ["rent", "mortgage", "landlord", "hoa", "property tax", "home insurance"]),
    ("Utilities",     ["electric", "electricity", "gas bill", "water bill", "internet", "wifi",
                       "cable", "phone bill", "cell", "utility"]),
    ("Groceries",     ["grocery", "groceries", "supermarket", "whole foods", "trader joe",
                       "safeway", "kroger", "costco", "walmart", "target", "aldi", "publix",
                       "food lion", "market"]),
    ("Dining",        ["restaurant", "cafe", "coffee", "starbucks", "mcdonald", "burger",
                       "pizza", "sushi", "taco", "chipotle", "doordash", "uber eats",
                       "grubhub", "instacart", "takeout", "take-out", "dining", "lunch",
                       "breakfast", "dinner", "bar", "brewery"]),
    ("Transport",     ["uber", "lyft", "taxi", "metro", "subway", "bus", "train", "amtrak",
                       "gas station", "fuel", "parking", "toll", "car insurance",
                       "auto insurance", "car payment", "vehicle"]),
    ("Healthcare",    ["pharmacy", "cvs", "walgreens", "doctor", "dentist", "hospital",
                       "clinic", "prescription", "insurance", "health", "medical", "therapy"]),
    ("Entertainment", ["netflix", "spotify", "hulu", "disney", "amazon prime", "apple tv",
                       "cinema", "movie", "theater", "concert", "ticket", "game", "steam",
                       "playstation", "xbox", "subscription"]),
    ("Shopping",      ["amazon", "ebay", "etsy", "zara", "h&m", "gap", "nike", "adidas",
                       "clothing", "clothes", "shoes", "fashion", "shop", "store", "mall"]),
    ("Travel",        ["hotel", "airbnb", "vrbo", "flight", "airline", "airport", "booking",
                       "expedia", "vacation", "travel", "trip"]),
    ("Education",     ["tuition", "school", "university", "college", "course", "udemy",
                       "coursera", "book", "textbook", "student loan"]),
    ("Savings",       ["savings", "investment", "brokerage", "401k", "ira", "roth",
                       "vanguard", "fidelity", "schwab", "etf", "stock", "mutual fund"]),
]

_DEFAULT_CATEGORY = "Other"


def categorize_expense(description: str, amount: float | None = None) -> dict:
    """Return the predicted category for a single expense.

    Args:
        description: Free-text description of the expense.
        amount:      Optional dollar amount (not used in categorisation but
                     returned for convenience).
    """
    lower = description.lower()
    for category, keywords in _CATEGORY_RULES:
        for kw in keywords:
            if re.search(r"\b" + re.escape(kw) + r"\b", lower):
                return {
                    "category": category,
                    "description": description,
                    "amount": amount,
                    "matched_keyword": kw,
                }
    return {
        "category": _DEFAULT_CATEGORY,
        "description": description,
        "amount": amount,
        "matched_keyword": None,
    }


def categorize_expenses(expenses: list[dict]) -> list[dict]:
    """Categorise a list of expenses.

    Each expense dict must have a ``description`` key and optionally ``amount``.
    """
    return [
        categorize_expense(e["description"], e.get("amount"))
        for e in expenses
    ]


# ---------------------------------------------------------------------------
# Forecasting
# ---------------------------------------------------------------------------

def forecast_expenses(
    monthly_totals: list[float],
    months_ahead: int = 3,
) -> dict:
    """Forecast future monthly totals using linear regression.

    Args:
        monthly_totals: Ordered list of past monthly spending totals.
        months_ahead:   How many future months to predict.

    Returns a dict with ``forecast`` (list of predicted values) and
    ``trend_slope`` (monthly change in spending).
    """
    if len(monthly_totals) < 2:
        raise ValueError("Need at least 2 months of data to forecast")

    n = len(monthly_totals)
    x = np.arange(n, dtype=float)
    y = np.array(monthly_totals, dtype=float)

    # Ordinary least-squares
    slope, intercept = np.polyfit(x, y, 1)

    # Predict future months
    future_x = np.arange(n, n + months_ahead, dtype=float)
    forecast = slope * future_x + intercept

    # Clamp to zero – spending can't be negative
    forecast = np.maximum(forecast, 0.0)

    # Simple confidence interval (±1 std of residuals)
    # Use ddof = max(1, n-2) because linear regression consumes 2 degrees of freedom
    residuals = y - (slope * x + intercept)
    std_err = float(residuals.std(ddof=max(1, n - 2)))

    return {
        "forecast": [round(float(v), 2) for v in forecast],
        "lower": [round(max(float(v) - std_err, 0), 2) for v in forecast],
        "upper": [round(float(v) + std_err, 2) for v in forecast],
        "trend_slope": round(float(slope), 2),
        "trend_direction": "increasing" if slope > 0 else "decreasing" if slope < 0 else "flat",
    }


def aggregate_by_category(categorized_expenses: list[dict]) -> dict[str, float]:
    """Sum amounts by category."""
    totals: dict[str, float] = {}
    for e in categorized_expenses:
        cat = e.get("category", _DEFAULT_CATEGORY)
        totals[cat] = round(totals.get(cat, 0.0) + (e.get("amount") or 0.0), 2)
    return totals
