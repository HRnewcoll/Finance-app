"""Market data fetching with yfinance, with a static fallback."""

import datetime
from typing import Optional

try:
    import yfinance as yf
    _YFINANCE_AVAILABLE = True
except ImportError:
    _YFINANCE_AVAILABLE = False

# Annualised S&P 500 monthly returns (1950–2023) used as a fallback
_FALLBACK_STATS = {
    "^GSPC": {"mean": 0.1016, "std": 0.1963, "source": "historical_fallback"},
    "^IXIC": {"mean": 0.1124, "std": 0.2372, "source": "historical_fallback"},
    "^DJI":  {"mean": 0.0878, "std": 0.1642, "source": "historical_fallback"},
    "AGG":   {"mean": 0.0400, "std": 0.0550, "source": "historical_fallback"},
}


def get_return_stats(
    ticker: str = "^GSPC",
    period_years: int = 20,
    fallback_on_error: bool = True,
) -> dict:
    """Return annualised mean and standard-deviation of returns for *ticker*.

    Uses yfinance to download historical adjusted-close prices, then computes
    log-returns.  Falls back to hard-coded values when the network is
    unavailable or yfinance is not installed.
    """
    if _YFINANCE_AVAILABLE:
        try:
            end = datetime.date.today()
            start = end - datetime.timedelta(days=period_years * 365)
            data = yf.download(
                ticker,
                start=start.isoformat(),
                end=end.isoformat(),
                auto_adjust=True,
                progress=False,
            )
            if data.empty or len(data) < 12:
                raise ValueError("Insufficient data returned")

            import numpy as np

            prices = data["Close"].squeeze().dropna().values.astype(float)
            # Monthly log-returns: sample ~every 21 trading days
            step = 21
            monthly_prices = prices[::step]
            log_returns = np.diff(np.log(monthly_prices))
            if len(log_returns) < 6:
                raise ValueError("Too few monthly observations")

            mean_monthly = float(log_returns.mean())
            std_monthly  = float(log_returns.std(ddof=1))

            # Annualise
            mean_annual = mean_monthly * 12
            std_annual   = std_monthly  * (12 ** 0.5)

            return {
                "ticker": ticker,
                "mean": round(mean_annual, 6),
                "std":  round(std_annual,  6),
                "source": "yfinance",
                "period_years": period_years,
            }
        except Exception as exc:  # noqa: BLE001
            if not fallback_on_error:
                raise
            # Fall through to static fallback
            _ = exc

    fallback = _FALLBACK_STATS.get(ticker, _FALLBACK_STATS["^GSPC"])
    return {
        "ticker": ticker,
        "mean": fallback["mean"],
        "std":  fallback["std"],
        "source": fallback["source"],
    }


def list_available_tickers() -> list[dict]:
    """Return the supported tickers with their descriptions."""
    return [
        {"ticker": "^GSPC", "name": "S&P 500"},
        {"ticker": "^IXIC", "name": "NASDAQ Composite"},
        {"ticker": "^DJI",  "name": "Dow Jones Industrial Average"},
        {"ticker": "AGG",   "name": "US Aggregate Bond ETF"},
    ]
