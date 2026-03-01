"""Monte Carlo retirement/investment simulator using historical market statistics."""

import numpy as np


# S&P 500 historical annualised stats (1928–2023) as a fallback
_SP500_MEAN = 0.1016   # ~10.16% nominal annual return
_SP500_STD = 0.1963    # ~19.63% annual standard deviation


def run_simulation(
    current_savings: float,
    monthly_contribution: float,
    current_age: int,
    retirement_age: int,
    annual_return_mean: float = _SP500_MEAN,
    annual_return_std: float = _SP500_STD,
    n_simulations: int = 1000,
    inflation_rate: float = 0.025,
    random_seed: int | None = 42,
) -> dict:
    """Run a Monte Carlo retirement simulation.

    Each simulation draws annual returns from a normal distribution, compounds
    monthly contributions, and records the portfolio value at each year until
    retirement.

    Returns a dict containing:
        years            – list of calendar years (x-axis labels)
        p10, p25, p50, p75, p90  – percentile portfolio paths
        mean             – mean portfolio path
        final_stats      – summary stats at retirement
    """
    if retirement_age <= current_age:
        raise ValueError("retirement_age must be greater than current_age")
    if current_savings < 0:
        raise ValueError("current_savings must be non-negative")

    rng = np.random.default_rng(random_seed)
    horizon = retirement_age - current_age  # years

    # Shape: (n_simulations, horizon + 1)
    portfolios = np.zeros((n_simulations, horizon + 1))
    portfolios[:, 0] = current_savings

    # Monthly contribution compounded within each year
    for year in range(horizon):
        # Draw annual returns for all simulations at once
        annual_returns = rng.normal(annual_return_mean, annual_return_std, n_simulations)
        # Cap catastrophic losses at -80% to avoid negative portfolios
        annual_returns = np.clip(annual_returns, -0.80, None)
        monthly_rate = (1 + annual_returns) ** (1 / 12) - 1

        # Future value of existing portfolio after 12 months
        future_value = portfolios[:, year] * (1 + annual_returns)

        # Future value of monthly contributions (annuity due approximation)
        # FV = C * ((1+r)^12 - 1) / r   (avoids divide-by-zero)
        safe_rate = np.where(np.abs(monthly_rate) < 1e-10, 1e-10, monthly_rate)
        contribution_fv = monthly_contribution * ((1 + safe_rate) ** 12 - 1) / safe_rate

        portfolios[:, year + 1] = future_value + contribution_fv

    # Percentiles across simulations at each year
    percentiles = np.percentile(portfolios, [10, 25, 50, 75, 90], axis=0)

    # Real (inflation-adjusted) present value at retirement
    real_factor = (1 + inflation_rate) ** horizon
    final_values = portfolios[:, -1]

    years = list(range(current_age, retirement_age + 1))

    return {
        "years": years,
        "p10": _round_list(percentiles[0]),
        "p25": _round_list(percentiles[1]),
        "p50": _round_list(percentiles[2]),
        "p75": _round_list(percentiles[3]),
        "p90": _round_list(percentiles[4]),
        "mean": _round_list(portfolios.mean(axis=0)),
        "final_stats": {
            "p10": round(float(np.percentile(final_values, 10)), 2),
            "p25": round(float(np.percentile(final_values, 25)), 2),
            "p50": round(float(np.percentile(final_values, 50)), 2),
            "p75": round(float(np.percentile(final_values, 75)), 2),
            "p90": round(float(np.percentile(final_values, 90)), 2),
            "mean": round(float(final_values.mean()), 2),
            "real_p50": round(float(np.percentile(final_values, 50) / real_factor), 2),
            "probability_of_success": round(
                float(np.mean(final_values >= 1_000_000)) * 100, 1
            ),
        },
    }


def _round_list(arr: np.ndarray, decimals: int = 2) -> list[float]:
    return [round(float(v), decimals) for v in arr]
