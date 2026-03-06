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


# ---------------------------------------------------------------------------
# Budget planner tests
# ---------------------------------------------------------------------------

class TestBudgetPlanner:
    def test_returns_expected_keys(self):
        from budget import analyze_budget
        result = analyze_budget(
            budget_limits={"Housing": 1500, "Groceries": 400},
            actual_spending={"Housing": 1450, "Groceries": 523},
        )
        assert "categories" in result
        assert "total_budget" in result
        assert "total_actual" in result
        assert "total_remaining" in result
        assert "over_budget_categories" in result
        assert "savings_rate_pct" in result

    def test_under_budget_status_ok(self):
        from budget import analyze_budget
        result = analyze_budget({"Food": 500}, {"Food": 300})
        assert result["categories"]["Food"]["status"] == "ok"
        assert result["categories"]["Food"]["remaining"] == pytest.approx(200.0)

    def test_warning_at_76_to_100_pct(self):
        from budget import analyze_budget
        result = analyze_budget({"Food": 100}, {"Food": 80})
        assert result["categories"]["Food"]["status"] == "warning"

    def test_over_budget_status(self):
        from budget import analyze_budget
        result = analyze_budget({"Dining": 200}, {"Dining": 350})
        assert result["categories"]["Dining"]["status"] == "over"
        assert "Dining" in result["over_budget_categories"]

    def test_category_in_actual_not_in_budget(self):
        from budget import analyze_budget
        # Spending on a category with no budget → status "over"
        result = analyze_budget({"Housing": 1500}, {"Housing": 1200, "Shopping": 80})
        assert "Shopping" in result["categories"]
        assert result["categories"]["Shopping"]["status"] == "over"

    def test_total_amounts(self):
        from budget import analyze_budget
        result = analyze_budget(
            {"A": 100, "B": 200},
            {"A": 80, "B": 150},
        )
        assert result["total_budget"] == pytest.approx(300.0)
        assert result["total_actual"] == pytest.approx(230.0)
        assert result["total_remaining"] == pytest.approx(70.0)

    def test_savings_rate_calculated(self):
        from budget import analyze_budget
        result = analyze_budget({"A": 1000}, {"A": 600})
        assert result["savings_rate_pct"] == pytest.approx(40.0)

    def test_savings_rate_clamped_to_zero_when_over(self):
        from budget import analyze_budget
        result = analyze_budget({"A": 100}, {"A": 200})
        assert result["savings_rate_pct"] == 0.0

    def test_empty_budgets(self):
        from budget import analyze_budget
        result = analyze_budget({}, {})
        assert result["total_budget"] == 0.0
        assert result["total_actual"] == 0.0
        assert result["over_budget_categories"] == []

    def test_pct_used_precision(self):
        from budget import analyze_budget
        result = analyze_budget({"X": 300}, {"X": 150})
        assert result["categories"]["X"]["pct_used"] == pytest.approx(50.0)
"""Backend tests for accessibility tools API."""

import base64
import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Colour-contrast / check
# ---------------------------------------------------------------------------

def test_contrast_check_black_on_white():
    resp = client.post(
        "/api/color-contrast/check",
        json={"foreground": "#000000", "background": "#ffffff"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["contrast_ratio"] == 21.0
    assert data["wcag_level"] == "AAA"
    assert data["passes_aa"] is True
    assert data["passes_aaa"] is True


def test_contrast_check_low_contrast():
    # Light grey on white – very low contrast
    resp = client.post(
        "/api/color-contrast/check",
        json={"foreground": "#cccccc", "background": "#ffffff"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["wcag_level"] == "Fail"
    assert data["passes_aa"] is False
    assert data["passes_aaa"] is False


def test_contrast_check_aa_pass():
    # Dark blue on white should pass AA
    resp = client.post(
        "/api/color-contrast/check",
        json={"foreground": "#005fcc", "background": "#ffffff"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["passes_aa"] is True


def test_contrast_check_shorthand_hex():
    resp = client.post(
        "/api/color-contrast/check",
        json={"foreground": "#000", "background": "#fff"},
    )
    assert resp.status_code == 200
    assert resp.json()["contrast_ratio"] == 21.0


def test_contrast_check_invalid_hex():
    resp = client.post(
        "/api/color-contrast/check",
        json={"foreground": "notacolour", "background": "#ffffff"},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Colour-contrast / fix
# ---------------------------------------------------------------------------

def test_contrast_fix_already_passing():
    resp = client.post(
        "/api/color-contrast/fix",
        json={"foreground": "#000000", "background": "#ffffff", "target": "AA"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["suggested_foreground"] == "#000000"
    assert data["contrast_ratio"] >= 4.5


def test_contrast_fix_improves_contrast():
    # Very light grey on white – should be fixed
    resp = client.post(
        "/api/color-contrast/fix",
        json={"foreground": "#bbbbbb", "background": "#ffffff", "target": "AA"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["contrast_ratio"] >= 4.5


def test_contrast_fix_aaa_target():
    resp = client.post(
        "/api/color-contrast/fix",
        json={"foreground": "#777777", "background": "#ffffff", "target": "AAA"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["contrast_ratio"] >= 7.0


# ---------------------------------------------------------------------------
# ARIA validation
# ---------------------------------------------------------------------------

def test_aria_validate_clean_html():
    html = """
    <html><body>
      <main>
        <img src="logo.png" alt="Company logo" />
        <button>Click me</button>
        <label for="name">Name</label>
        <input id="name" type="text" />
        <a href="/">Home</a>
      </main>
    </body></html>
    """
    resp = client.post("/api/aria/validate", json={"html": html})
    assert resp.status_code == 200
    data = resp.json()
    assert data["passed"] is True
    assert data["issue_count"] == 0


def test_aria_validate_missing_alt():
    html = '<img src="photo.jpg" />'
    resp = client.post("/api/aria/validate", json={"html": html})
    assert resp.status_code == 200
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "img-alt" in rules


def test_aria_validate_empty_alt_warning():
    html = '<img src="deco.png" alt="" />'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "img-alt-empty" in rules


def test_aria_validate_missing_input_label():
    html = '<input type="text" />'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "input-label" in rules


def test_aria_validate_input_with_aria_label():
    html = '<input type="text" aria-label="Search" />'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "input-label" not in rules


def test_aria_validate_empty_button():
    html = "<button></button>"
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "button-name" in rules


def test_aria_validate_empty_link():
    html = '<a href="/about"></a>'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "link-name" in rules


def test_aria_validate_invalid_role():
    html = '<div role="fakeRole">content</div>'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "aria-valid-role" in rules


def test_aria_validate_valid_role():
    html = '<div role="navigation"><a href="/">Home</a></div>'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "aria-valid-role" not in rules


def test_aria_validate_listbox_missing_option():
    html = '<ul role="listbox"><li>Item</li></ul>'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "aria-required-children" in rules


def test_aria_validate_no_main_landmark():
    html = "<html><body><p>Hello</p></body></html>"
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "landmark-main" in rules


# ---------------------------------------------------------------------------
# Image describe
# ---------------------------------------------------------------------------

def _make_b64_png(width: int = 100, height: int = 60) -> str:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=(255, 0, 0))
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def test_image_describe_basic():
    b64 = _make_b64_png(200, 100)
    resp = client.post(
        "/api/image/describe",
        json={"image_base64": b64, "filename": "budget_chart.png"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["width"] == 200
    assert data["height"] == 100
    assert data["format"] == "PNG"
    assert "budget chart" in data["estimated_alt_text"]


def test_image_describe_square():
    b64 = _make_b64_png(50, 50)
    resp = client.post("/api/image/describe", json={"image_base64": b64})
    assert resp.status_code == 200
    data = resp.json()
    assert data["width"] == 50
    assert data["height"] == 50


def test_image_describe_data_uri_prefix():
    b64 = _make_b64_png()
    uri = f"data:image/png;base64,{b64}"
    resp = client.post("/api/image/describe", json={"image_base64": uri})
    assert resp.status_code == 200
    assert resp.json()["format"] == "PNG"


def test_image_describe_invalid_data():
    resp = client.post("/api/image/describe", json={"image_base64": "notbase64!!"})
    assert resp.status_code == 422
