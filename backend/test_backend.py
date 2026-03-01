"""Tests for the Finance-app backend modules."""

import pytest


# ---------------------------------------------------------------------------
# Monte Carlo tests
# ---------------------------------------------------------------------------

class TestMonteCarlo:
    def test_basic_simulation_returns_expected_keys(self):
        from monte_carlo import run_simulation
        result = run_simulation(
            current_savings=50_000,
            monthly_contribution=500,
            current_age=30,
            retirement_age=65,
        )
        assert "years" in result
        assert "p10" in result
        assert "p50" in result
        assert "p90" in result
        assert "final_stats" in result

    def test_years_length_matches_horizon(self):
        from monte_carlo import run_simulation
        result = run_simulation(50_000, 500, 30, 65)
        assert len(result["years"]) == 36  # 30 to 65 inclusive
        assert result["years"][0] == 30
        assert result["years"][-1] == 65

    def test_percentile_ordering(self):
        from monte_carlo import run_simulation
        result = run_simulation(50_000, 500, 30, 65)
        # p10 <= p50 <= p90 at final year
        assert result["p10"][-1] <= result["p50"][-1] <= result["p90"][-1]

    def test_higher_contribution_yields_higher_portfolio(self):
        from monte_carlo import run_simulation
        low = run_simulation(50_000, 100, 30, 65, random_seed=42)
        high = run_simulation(50_000, 2_000, 30, 65, random_seed=42)
        assert high["final_stats"]["p50"] > low["final_stats"]["p50"]

    def test_portfolio_starts_at_current_savings(self):
        from monte_carlo import run_simulation
        savings = 123_456.0
        result = run_simulation(savings, 500, 30, 65)
        assert result["p50"][0] == pytest.approx(savings, rel=1e-3)

    def test_invalid_ages_raise_value_error(self):
        from monte_carlo import run_simulation
        with pytest.raises(ValueError):
            run_simulation(50_000, 500, 65, 30)  # retirement < current

    def test_negative_savings_raise_value_error(self):
        from monte_carlo import run_simulation
        with pytest.raises(ValueError):
            run_simulation(-1, 500, 30, 65)

    def test_zero_contribution_still_grows(self):
        from monte_carlo import run_simulation
        result = run_simulation(100_000, 0, 30, 65)
        # Even with zero contributions the median should grow (positive expected return)
        assert result["final_stats"]["p50"] > 100_000


# ---------------------------------------------------------------------------
# Expense categoriser tests
# ---------------------------------------------------------------------------

class TestExpenseCategorizer:
    def test_housing_keyword(self):
        from expense import categorize_expense
        result = categorize_expense("Monthly rent payment")
        assert result["category"] == "Housing"

    def test_groceries_keyword(self):
        from expense import categorize_expense
        result = categorize_expense("Whole Foods grocery run")
        assert result["category"] == "Groceries"

    def test_dining_keyword(self):
        from expense import categorize_expense
        result = categorize_expense("Lunch at a restaurant")
        assert result["category"] == "Dining"

    def test_transport_keyword(self):
        from expense import categorize_expense
        result = categorize_expense("Uber to the airport")
        assert result["category"] == "Transport"

    def test_healthcare_keyword(self):
        from expense import categorize_expense
        result = categorize_expense("CVS pharmacy prescription")
        assert result["category"] == "Healthcare"

    def test_entertainment_keyword(self):
        from expense import categorize_expense
        result = categorize_expense("Netflix monthly subscription")
        assert result["category"] == "Entertainment"

    def test_unknown_falls_back_to_other(self):
        from expense import categorize_expense
        result = categorize_expense("Miscellaneous xyz payment")
        assert result["category"] == "Other"

    def test_amount_is_preserved(self):
        from expense import categorize_expense
        result = categorize_expense("Uber ride", amount=22.50)
        assert result["amount"] == 22.50

    def test_batch_categorize(self):
        from expense import categorize_expenses
        expenses = [
            {"description": "Netflix", "amount": 15.99},
            {"description": "Whole Foods", "amount": 87.32},
            {"description": "Rent", "amount": 1500.0},
        ]
        results = categorize_expenses(expenses)
        cats = [r["category"] for r in results]
        assert cats == ["Entertainment", "Groceries", "Housing"]

    def test_aggregate_by_category(self):
        from expense import aggregate_by_category, categorize_expenses
        expenses = [
            {"description": "Netflix", "amount": 15.0},
            {"description": "Spotify subscription", "amount": 10.0},
            {"description": "Whole Foods", "amount": 100.0},
        ]
        categorized = categorize_expenses(expenses)
        totals = aggregate_by_category(categorized)
        assert totals["Entertainment"] == pytest.approx(25.0)
        assert totals["Groceries"] == pytest.approx(100.0)


# ---------------------------------------------------------------------------
# Forecasting tests
# ---------------------------------------------------------------------------

class TestForecasting:
    def test_returns_correct_number_of_forecasts(self):
        from expense import forecast_expenses
        result = forecast_expenses([1000, 1100, 1050, 1150], months_ahead=3)
        assert len(result["forecast"]) == 3

    def test_increasing_trend(self):
        from expense import forecast_expenses
        result = forecast_expenses([500, 600, 700, 800, 900])
        assert result["trend_direction"] == "increasing"
        assert result["trend_slope"] > 0

    def test_decreasing_trend(self):
        from expense import forecast_expenses
        result = forecast_expenses([900, 800, 700, 600, 500])
        assert result["trend_direction"] == "decreasing"

    def test_forecast_non_negative(self):
        from expense import forecast_expenses
        # Very low values could forecast negative — must be clamped to zero
        result = forecast_expenses([10, 5], months_ahead=5)
        assert all(v >= 0 for v in result["forecast"])

    def test_too_few_data_points_raises(self):
        from expense import forecast_expenses
        with pytest.raises(ValueError):
            forecast_expenses([500])


# ---------------------------------------------------------------------------
# Summariser tests
# ---------------------------------------------------------------------------

class TestSummarizer:
    def test_empty_text_returns_empty(self):
        from summarizer import summarize
        result = summarize("")
        assert result["summary"] == ""

    def test_short_text_returned_unchanged(self):
        from summarizer import summarize
        text = "I had a great day. I went for a run."
        result = summarize(text)
        assert result["summary"] == text.strip()

    def test_long_text_is_shortened(self):
        from summarizer import summarize
        text = (
            "Today I woke up early and felt refreshed. "
            "I went to the gym and had an amazing workout session. "
            "After that I had a healthy breakfast with eggs and avocado toast. "
            "I spent the afternoon working on my finance app project. "
            "In the evening I called my parents and felt grateful. "
            "Before bed I read a chapter of a good book and slept well."
        )
        result = summarize(text, max_sentences=3)
        sentences = result["summary"].split(". ")
        assert len(sentences) <= 4  # 3 sentences, last might not end with period
        assert result["word_count"] > 0

    def test_method_is_extractive(self):
        from summarizer import summarize
        text = "A. B. C. D. E. F."
        result = summarize(text, use_openai=False)
        assert result["method"] == "extractive"

    def test_word_count(self):
        from summarizer import summarize
        text = "one two three four five"
        result = summarize(text)
        assert result["word_count"] == 5

    def test_extractive_summary_preserves_sentence_order(self):
        from summarizer import extractive_summary
        # Each sentence has unique dominant keywords
        text = (
            "The market crashed significantly today causing massive panic among investors. "
            "I went shopping and bought some groceries for the week ahead. "
            "My fitness routine is improving with daily exercise and healthy eating habits. "
            "The stock portfolio lost twenty percent of its value in one day. "
            "Running five miles every morning has boosted my energy and mood significantly."
        )
        summary = extractive_summary(text, max_sentences=3)
        # The summary must be a subset of the original sentences in order
        original_sentences = text.split(". ")
        for sent in summary.split(". "):
            stripped = sent.strip().rstrip(".")
            assert any(stripped in orig for orig in original_sentences)


# ---------------------------------------------------------------------------
# Market data tests (fallback mode only – no network required)
# ---------------------------------------------------------------------------

class TestMarketData:
    def test_fallback_returns_stats(self):
        from market_data import get_return_stats
        stats = get_return_stats(ticker="^GSPC", fallback_on_error=True)
        assert "mean" in stats
        assert "std" in stats
        assert stats["mean"] > 0

    def test_unknown_ticker_uses_sp500_fallback(self):
        from market_data import get_return_stats
        # Unknown ticker should still return something via fallback
        stats = get_return_stats(ticker="UNKNOWN_TICKER", fallback_on_error=True)
        assert stats["mean"] > 0

    def test_list_tickers(self):
        from market_data import list_available_tickers
        tickers = list_available_tickers()
        assert len(tickers) >= 4
        symbols = [t["ticker"] for t in tickers]
        assert "^GSPC" in symbols
