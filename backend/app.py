"""Flask API for Finance-app.

Endpoints:
  GET  /api/market-data          – Return market return stats for a ticker
  GET  /api/tickers              – List supported tickers
  POST /api/simulate             – Run Monte Carlo retirement simulation
  POST /api/expenses/categorize  – Categorise a list of expenses
  POST /api/expenses/forecast    – Forecast future spending
  POST /api/expenses/aggregate   – Aggregate spending by category
  POST /api/summarize            – Summarise a journal entry
"""

from __future__ import annotations

from flask import Flask, jsonify, request
from flask_cors import CORS

from expense import aggregate_by_category, categorize_expenses, forecast_expenses
from market_data import get_return_stats, list_available_tickers
from monte_carlo import run_simulation
from summarizer import summarize

app = Flask(__name__)
CORS(app)  # Allow requests from the React dev server


# ---------------------------------------------------------------------------
# Market data
# ---------------------------------------------------------------------------

@app.get("/api/tickers")
def tickers():
    return jsonify(list_available_tickers())


@app.get("/api/market-data")
def market_data():
    ticker = request.args.get("ticker", "^GSPC")
    period = int(request.args.get("period_years", 20))
    stats = get_return_stats(ticker=ticker, period_years=period)
    return jsonify(stats)


# ---------------------------------------------------------------------------
# Monte Carlo simulation
# ---------------------------------------------------------------------------

@app.post("/api/simulate")
def simulate():
    data = request.get_json(force=True)

    required = ("current_savings", "monthly_contribution", "current_age", "retirement_age")
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    try:
        result = run_simulation(
            current_savings=float(data["current_savings"]),
            monthly_contribution=float(data["monthly_contribution"]),
            current_age=int(data["current_age"]),
            retirement_age=int(data["retirement_age"]),
            annual_return_mean=float(data.get("annual_return_mean", 0.1016)),
            annual_return_std=float(data.get("annual_return_std", 0.1963)),
            n_simulations=int(data.get("n_simulations", 1000)),
            inflation_rate=float(data.get("inflation_rate", 0.025)),
        )
        return jsonify(result)
    except (ValueError, TypeError) as exc:
        return jsonify({"error": str(exc)}), 400


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------

@app.post("/api/expenses/categorize")
def expenses_categorize():
    data = request.get_json(force=True)
    expenses = data.get("expenses")
    if not isinstance(expenses, list):
        return jsonify({"error": "'expenses' must be a list"}), 400
    return jsonify(categorize_expenses(expenses))


@app.post("/api/expenses/aggregate")
def expenses_aggregate():
    data = request.get_json(force=True)
    expenses = data.get("expenses")
    if not isinstance(expenses, list):
        return jsonify({"error": "'expenses' must be a list"}), 400
    categorized = categorize_expenses(expenses)
    totals = aggregate_by_category(categorized)
    return jsonify({"by_category": totals, "categorized": categorized})


@app.post("/api/expenses/forecast")
def expenses_forecast():
    data = request.get_json(force=True)
    monthly_totals = data.get("monthly_totals")
    if not isinstance(monthly_totals, list) or len(monthly_totals) < 2:
        return jsonify({"error": "'monthly_totals' must be a list of at least 2 numbers"}), 400
    months_ahead = int(data.get("months_ahead", 3))
    try:
        result = forecast_expenses(
            monthly_totals=[float(v) for v in monthly_totals],
            months_ahead=months_ahead,
        )
        return jsonify(result)
    except (ValueError, TypeError) as exc:
        return jsonify({"error": str(exc)}), 400


# ---------------------------------------------------------------------------
# Journal summariser
# ---------------------------------------------------------------------------

@app.post("/api/summarize")
def summarize_journal():
    data = request.get_json(force=True)
    text = data.get("text", "")
    max_sentences = int(data.get("max_sentences", 3))
    use_openai = bool(data.get("use_openai", False))
    if not isinstance(text, str):
        return jsonify({"error": "'text' must be a string"}), 400
    result = summarize(text=text, max_sentences=max_sentences, use_openai=use_openai)
    return jsonify(result)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    import os as _os
    _debug = _os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(debug=_debug, port=5000)
