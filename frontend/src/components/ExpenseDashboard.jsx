import React, { useState, useCallback } from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import axios from 'axios';

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title,
  PointElement, LineElement, Filler,
);

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CATEGORY_COLORS = {
  Housing:       '#3b82f6',
  Utilities:     '#7dd3fc',
  Groceries:     '#22c55e',
  Dining:        '#f97316',
  Transport:     '#a78bfa',
  Healthcare:    '#94a3b8',
  Entertainment: '#c084fc',
  Shopping:      '#e879f9',
  Travel:        '#2dd4bf',
  Education:     '#d6d3d1',
  Savings:       '#4ade80',
  Other:         '#737373',
};

const SAMPLE_EXPENSES = [
  { description: 'Monthly rent payment',      amount: 1500 },
  { description: 'Whole Foods grocery run',   amount: 127.40 },
  { description: 'Netflix subscription',      amount: 15.99 },
  { description: 'Spotify subscription',      amount: 9.99 },
  { description: 'Uber to downtown',          amount: 18.50 },
  { description: 'CVS pharmacy prescription', amount: 35.00 },
  { description: 'Restaurant dinner',         amount: 62.00 },
  { description: 'Electric bill',             amount: 88.00 },
  { description: 'Amazon purchase',           amount: 44.95 },
  { description: 'Gas station fill-up',       amount: 55.00 },
];

const SAMPLE_MONTHLY = [2800, 3100, 2950, 3300, 3450, 3200];

const fmt = v => `$${parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const monthLabel = offsetFromNow => {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetFromNow);
  return d.toLocaleString('default', { month: 'short', year: '2-digit' });
};

export default function ExpenseDashboard() {
  const [expenses, setExpenses] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categorized, setCategorized] = useState([]);
  const [aggregated, setAggregated] = useState({});
  const [forecast, setForecast] = useState(null);
  const [monthlyInput, setMonthlyInput] = useState(SAMPLE_MONTHLY.join(', '));
  const [loading, setLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [error, setError] = useState('');
  const [forecastError, setForecastError] = useState('');

  const addExpense = () => {
    const desc = description.trim();
    const amt  = parseFloat(amount);
    if (!desc || isNaN(amt) || amt <= 0) return;
    setExpenses(e => [...e, { description: desc, amount: amt }]);
    setDescription('');
    setAmount('');
  };

  const loadSamples = () => {
    setExpenses(SAMPLE_EXPENSES);
    setCategorized([]);
    setAggregated({});
  };

  const categorizeAll = useCallback(async () => {
    if (!expenses.length) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(`${API}/api/expenses/aggregate`, { expenses });
      setCategorized(data.categorized);
      setAggregated(data.by_category);
    } catch {
      setError('Could not reach the API. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [expenses]);

  const runForecast = useCallback(async () => {
    const totals = monthlyInput
      .split(',')
      .map(v => parseFloat(v.trim()))
      .filter(v => !isNaN(v) && v >= 0);
    if (totals.length < 2) {
      setForecastError('Enter at least 2 monthly totals separated by commas.');
      return;
    }
    setForecastLoading(true);
    setForecastError('');
    setForecast(null);
    try {
      const { data } = await axios.post(`${API}/api/expenses/forecast`, {
        monthly_totals: totals,
        months_ahead: 3,
      });
      setForecast({ ...data, history: totals });
    } catch {
      setForecastError('Forecast API error. Is the backend running?');
    } finally {
      setForecastLoading(false);
    }
  }, [monthlyInput]);

  const removeExpense = idx =>
    setExpenses(e => e.filter((_, i) => i !== idx));

  // ── Chart data ──────────────────────────────────────────────────────────

  const donutData = Object.keys(aggregated).length
    ? {
        labels: Object.keys(aggregated),
        datasets: [{
          data: Object.values(aggregated),
          backgroundColor: Object.keys(aggregated).map(c => CATEGORY_COLORS[c] || '#737373'),
          borderColor: '#1a1d27',
          borderWidth: 2,
        }],
      }
    : null;

  const barData = Object.keys(aggregated).length
    ? {
        labels: Object.keys(aggregated),
        datasets: [{
          label: 'Spending ($)',
          data: Object.values(aggregated),
          backgroundColor: Object.keys(aggregated).map(c => CATEGORY_COLORS[c] || '#737373'),
          borderRadius: 5,
        }],
      }
    : null;

  const buildForecastChart = () => {
    if (!forecast) return null;
    const history = forecast.history;
    const n = history.length;

    // Labels: past months + future months
    const histLabels = Array.from({ length: n }, (_, i) => monthLabel(i - n));
    const futureLabels = Array.from({ length: forecast.forecast.length }, (_, i) => monthLabel(i + 1));
    const allLabels = [...histLabels, ...futureLabels];

    // History dataset (solid)
    const histData  = [...history, ...Array(forecast.forecast.length).fill(null)];
    // Forecast dataset (dashed)
    const forecastData = [...Array(n).fill(null), ...forecast.forecast];
    const upperData    = [...Array(n).fill(null), ...forecast.upper];
    const lowerData    = [...Array(n).fill(null), ...forecast.lower];

    return {
      labels: allLabels,
      datasets: [
        {
          label: 'Actual spending',
          data: histData,
          borderColor: '#6c63ff',
          backgroundColor: 'rgba(108,99,255,0.15)',
          borderWidth: 2,
          pointRadius: 4,
          fill: false,
        },
        {
          label: 'Forecast',
          data: forecastData,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.1)',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 4,
          fill: false,
        },
        {
          label: 'Upper bound',
          data: upperData,
          borderColor: 'rgba(245,158,11,0.3)',
          backgroundColor: 'rgba(245,158,11,0.07)',
          borderWidth: 1,
          pointRadius: 0,
          fill: '+1',
        },
        {
          label: 'Lower bound',
          data: lowerData,
          borderColor: 'rgba(245,158,11,0.3)',
          backgroundColor: 'rgba(245,158,11,0.07)',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
        },
      ],
    };
  };

  const forecastChartData = buildForecastChart();

  const chartOpts = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: '#94a3b8', boxWidth: 14, font: { size: 12 } } },
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: {
        ticks: { color: '#64748b', callback: v => `$${v.toLocaleString()}` },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
    },
  };

  return (
    <div>
      <div className="card">
        <h2 className="card-title">💰 Expense Categorizer</h2>

        {/* Add expense form */}
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 3 }}>
            <label>Description</label>
            <input
              type="text"
              placeholder="e.g. Whole Foods grocery run"
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExpense()}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Amount ($)</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              min="0"
              step="0.01"
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExpense()}
            />
          </div>
          <button className="btn btn-primary" onClick={addExpense}
            style={{ marginBottom: '1rem' }}>
            + Add
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <button className="btn btn-sm" onClick={loadSamples}
            style={{ background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
            Load sample data
          </button>
          <button className="btn btn-primary" onClick={categorizeAll}
            disabled={loading || !expenses.length}>
            {loading ? '⏳ Categorising…' : '🏷 Categorise All'}
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {/* Expense table */}
        {expenses.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp, i) => {
                  const cat = categorized[i]?.category;
                  return (
                    <tr key={i}>
                      <td>{exp.description}</td>
                      <td>{fmt(exp.amount)}</td>
                      <td>
                        {cat
                          ? <span className={`badge cat-${cat}`}>{cat}</span>
                          : <span style={{ color: 'var(--color-muted)' }}>—</span>}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'none', color: 'var(--color-danger)', padding: '0.2rem 0.5rem' }}
                          onClick={() => removeExpense(i)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts */}
      {Object.keys(aggregated).length > 0 && (
        <>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-label">Total Spending</div>
              <div className="stat-value">{fmt(Object.values(aggregated).reduce((a, b) => a + b, 0))}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Largest Category</div>
              <div className="stat-value success">
                {Object.entries(aggregated).sort((a, b) => b[1] - a[1])[0]?.[0]}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Categories</div>
              <div className="stat-value">{Object.keys(aggregated).length}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Avg per Category</div>
              <div className="stat-value warning">
                {fmt(Object.values(aggregated).reduce((a, b) => a + b, 0) / Object.keys(aggregated).length)}
              </div>
            </div>
          </div>

          <div className="two-col">
            <div className="card">
              <h3 className="card-title">Spending by Category</h3>
              <Doughnut
                data={donutData}
                options={{
                  plugins: {
                    legend: { position: 'right', labels: { color: '#94a3b8', boxWidth: 14, font: { size: 12 } } },
                    tooltip: {
                      callbacks: {
                        label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}`,
                      },
                    },
                  },
                  cutout: '60%',
                }}
              />
            </div>
            <div className="card">
              <h3 className="card-title">Category Breakdown</h3>
              <Bar data={barData} options={chartOpts} />
            </div>
          </div>
        </>
      )}

      {/* Forecast */}
      <div className="card">
        <h2 className="card-title">📊 Spending Forecast</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', margin: '0 0 1rem' }}>
          Enter your monthly totals (comma-separated) to forecast the next 3 months using linear regression.
        </p>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Monthly Totals ($) — oldest first</label>
            <input
              type="text"
              value={monthlyInput}
              onChange={e => setMonthlyInput(e.target.value)}
              placeholder="e.g. 2800, 3100, 2950, 3300"
            />
          </div>
          <button className="btn btn-primary" onClick={runForecast}
            disabled={forecastLoading} style={{ marginBottom: '1rem' }}>
            {forecastLoading ? '⏳ Forecasting…' : '🔮 Forecast'}
          </button>
        </div>

        {forecastError && <div className="error-msg">{forecastError}</div>}

        {forecast && (
          <>
            <div className="stats-grid">
              {forecast.forecast.map((v, i) => (
                <div key={i} className="stat-box">
                  <div className="stat-label">{monthLabel(i + 1)} (forecast)</div>
                  <div className={`stat-value ${forecast.trend_direction === 'increasing' ? 'warning' : 'success'}`}>
                    {fmt(v)}
                  </div>
                </div>
              ))}
              <div className="stat-box">
                <div className="stat-label">Trend</div>
                <div className={`stat-value ${forecast.trend_direction === 'increasing' ? 'warning' : 'success'}`}>
                  {forecast.trend_direction === 'increasing' ? '↑' : forecast.trend_direction === 'decreasing' ? '↓' : '→'}{' '}
                  {Math.abs(forecast.trend_slope) < 1 ? `${fmt(forecast.trend_slope)}/mo` : `${fmt(forecast.trend_slope)}/mo`}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">Spending History &amp; Forecast</h3>
              {forecastChartData && (
                <Line
                  data={forecastChartData}
                  options={{
                    ...chartOpts,
                    plugins: {
                      ...chartOpts.plugins,
                      tooltip: {
                        callbacks: {
                          label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
                        },
                      },
                    },
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
