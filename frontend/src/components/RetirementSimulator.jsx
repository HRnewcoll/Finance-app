import React, { useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import axios from 'axios';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
);

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const fmt = v =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(2)}M`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function RetirementSimulator() {
  const [params, setParams] = useState({
    current_savings: 50000,
    monthly_contribution: 1000,
    current_age: 30,
    retirement_age: 65,
    annual_return_mean: 0.1016,
    annual_return_std: 0.1963,
    inflation_rate: 0.025,
    n_simulations: 1000,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [marketSource, setMarketSource] = useState('manual');

  const set = (k, v) => setParams(p => ({ ...p, [k]: v }));

  const fetchMarketData = useCallback(async ticker => {
    try {
      const { data } = await axios.get(`${API}/api/market-data`, {
        params: { ticker },
      });
      set('annual_return_mean', parseFloat(data.mean.toFixed(4)));
      set('annual_return_std',  parseFloat(data.std.toFixed(4)));
      setMarketSource(data.source === 'yfinance' ? `yfinance (${ticker})` : `historical fallback (${ticker})`);
    } catch {
      setError('Could not fetch market data – using manual values.');
    }
  }, []);

  const simulate = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await axios.post(`${API}/api/simulate`, params);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Simulation failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? {
        labels: result.years,
        datasets: [
          {
            label: '90th percentile',
            data: result.p90,
            borderColor: 'rgba(34,197,94,0.7)',
            backgroundColor: 'rgba(34,197,94,0.08)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: '+1',
          },
          {
            label: '75th percentile',
            data: result.p75,
            borderColor: 'rgba(108,99,255,0.6)',
            backgroundColor: 'rgba(108,99,255,0.06)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: '+1',
          },
          {
            label: 'Median (50th)',
            data: result.p50,
            borderColor: '#6c63ff',
            backgroundColor: 'rgba(108,99,255,0.15)',
            borderWidth: 2.5,
            pointRadius: 0,
            fill: '+1',
          },
          {
            label: '25th percentile',
            data: result.p25,
            borderColor: 'rgba(245,158,11,0.6)',
            backgroundColor: 'rgba(245,158,11,0.06)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: '+1',
          },
          {
            label: '10th percentile',
            data: result.p10,
            borderColor: 'rgba(239,68,68,0.7)',
            backgroundColor: 'rgba(239,68,68,0.06)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { color: '#94a3b8', boxWidth: 14, font: { size: 12 } } },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', maxTicksLimit: 10 },
        grid: { color: 'rgba(255,255,255,0.04)' },
        title: { display: true, text: 'Age', color: '#64748b' },
      },
      y: {
        ticks: { color: '#64748b', callback: v => fmt(v) },
        grid: { color: 'rgba(255,255,255,0.04)' },
        title: { display: true, text: 'Portfolio Value', color: '#64748b' },
      },
    },
  };

  return (
    <div>
      <div className="card">
        <h2 className="card-title">📈 Retirement / Investment Simulator</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', margin: '0 0 1rem' }}>
          Monte Carlo simulation using {params.n_simulations.toLocaleString()} portfolio paths.
          Market return parameters are sourced from real S&amp;P 500 data.
        </p>

        {/* Market data preset buttons */}
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginRight: '0.75rem' }}>
            Load returns from:
          </span>
          {[
            { ticker: '^GSPC', label: 'S&P 500' },
            { ticker: '^IXIC', label: 'NASDAQ' },
            { ticker: '^DJI',  label: 'Dow Jones' },
            { ticker: 'AGG',   label: 'Bonds (AGG)' },
          ].map(({ ticker, label }) => (
            <button
              key={ticker}
              className="btn btn-sm"
              style={{ marginRight: '0.5rem', marginBottom: '0.35rem', background: 'var(--color-bg)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}
              onClick={() => fetchMarketData(ticker)}
            >
              {label}
            </button>
          ))}
          {marketSource !== 'manual' && (
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
              Source: {marketSource}
            </span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Current Savings ($)</label>
            <input type="number" value={params.current_savings}
              onChange={e => set('current_savings', +e.target.value)} min="0" />
          </div>
          <div className="form-group">
            <label>Monthly Contribution ($)</label>
            <input type="number" value={params.monthly_contribution}
              onChange={e => set('monthly_contribution', +e.target.value)} min="0" />
          </div>
          <div className="form-group">
            <label>Current Age</label>
            <input type="number" value={params.current_age}
              onChange={e => set('current_age', +e.target.value)} min="18" max="80" />
          </div>
          <div className="form-group">
            <label>Retirement Age</label>
            <input type="number" value={params.retirement_age}
              onChange={e => set('retirement_age', +e.target.value)} min="30" max="90" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Expected Annual Return</label>
            <input type="number" value={params.annual_return_mean} step="0.001"
              onChange={e => set('annual_return_mean', +e.target.value)} />
          </div>
          <div className="form-group">
            <label>Annual Volatility (std dev)</label>
            <input type="number" value={params.annual_return_std} step="0.001"
              onChange={e => set('annual_return_std', +e.target.value)} />
          </div>
          <div className="form-group">
            <label>Inflation Rate</label>
            <input type="number" value={params.inflation_rate} step="0.001"
              onChange={e => set('inflation_rate', +e.target.value)} />
          </div>
          <div className="form-group">
            <label>Simulations</label>
            <select value={params.n_simulations}
              onChange={e => set('n_simulations', +e.target.value)}>
              <option value={200}>200 (fast)</option>
              <option value={500}>500</option>
              <option value={1000}>1 000</option>
              <option value={2000}>2 000 (slow)</option>
            </select>
          </div>
        </div>

        <button className="btn btn-primary" onClick={simulate} disabled={loading}>
          {loading ? 'Running…' : '▶ Run Simulation'}
        </button>

        {error && <div className="error-msg">{error}</div>}
      </div>

      {loading && <div className="spinner" />}

      {result && (
        <>
          <div className="stats-grid">
            {[
              { label: '10th pct at retirement', value: fmt(result.final_stats.p10) },
              { label: '25th pct at retirement', value: fmt(result.final_stats.p25) },
              { label: 'Median at retirement',   value: fmt(result.final_stats.p50), cls: 'success' },
              { label: '75th pct at retirement', value: fmt(result.final_stats.p75) },
              { label: '90th pct at retirement', value: fmt(result.final_stats.p90) },
              { label: 'Real (inflation-adj) median', value: fmt(result.final_stats.real_p50), cls: 'warning' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="stat-box">
                <div className="stat-label">{label}</div>
                <div className={`stat-value ${cls || ''}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 className="card-title">Portfolio Value Over Time — Monte Carlo Bands</h3>
            <Line data={chartData} options={chartOptions} />
          </div>

          <div className="info-box">
            <strong>Probability of reaching $1 M+:</strong>{' '}
            <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
              {result.final_stats.probability_of_success}%
            </span>{' '}
            of simulated scenarios.
          </div>
        </>
      )}
    </div>
  );
}
