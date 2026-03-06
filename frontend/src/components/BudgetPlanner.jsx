import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CATEGORIES = [
  'Housing', 'Utilities', 'Groceries', 'Dining', 'Transport',
  'Healthcare', 'Entertainment', 'Shopping', 'Travel', 'Education', 'Savings',
];

const STATUS_COLOR = {
  ok:      { bg: 'rgba(34,197,94,0.15)',  border: '#22c55e', text: '#22c55e'  },
  warning: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#f59e0b'  },
  over:    { bg: 'rgba(239,68,68,0.15)',  border: '#ef4444', text: '#ef4444'  },
};

const STORAGE_KEY = 'finance_app_budget';
const ACTUAL_KEY  = 'finance_app_budget_actual';

const fmt = v => `$${parseFloat(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function loadStore(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); }
  catch { return {}; }
}

export default function BudgetPlanner() {
  const [budgets,  setBudgets]  = useState(() => loadStore(STORAGE_KEY));
  const [actuals,  setActuals]  = useState(() => loadStore(ACTUAL_KEY));
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [editMode, setEditMode] = useState('budgets'); // 'budgets' | 'actuals'

  const saveBudgets = (next) => { setBudgets(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); };
  const saveActuals = (next) => { setActuals(next); localStorage.setItem(ACTUAL_KEY,  JSON.stringify(next)); };

  const setField = (state, setter) => (cat, val) => {
    const v = val === '' ? '' : val;
    setter({ ...state, [cat]: v });
  };

  const analyze = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    const budgetsClean  = Object.fromEntries(Object.entries(budgets).filter(([, v]) => v !== '' && +v > 0).map(([k, v]) => [k, +v]));
    const actualsClean  = Object.fromEntries(Object.entries(actuals).filter(([, v]) => v !== '' && +v >= 0).map(([k, v]) => [k, +v]));
    try {
      const { data } = await axios.post(`${API}/api/budget/analyze`, {
        budgets: budgetsClean,
        actual: actualsClean,
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reach the API. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [budgets, actuals]);

  // Auto-analyze on first load if localStorage already has data
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const hasAny = Object.values(budgets).some(v => v !== '' && +v > 0)
                || Object.values(actuals).some(v => v !== '' && +v >= 0);
    if (hasAny) analyze();
  }, [analyze]);

  const hasData = result !== null;

  // ── Chart ────────────────────────────────────────────────────────────────
  const chartData = hasData ? {
    labels: Object.keys(result.categories),
    datasets: [
      {
        label: 'Budget',
        data: Object.values(result.categories).map(c => c.budget),
        backgroundColor: 'rgba(108,99,255,0.45)',
        borderColor: '#6c63ff',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Actual',
        data: Object.values(result.categories).map(c => c.actual),
        backgroundColor: Object.values(result.categories).map(c =>
          STATUS_COLOR[c.status].bg.replace('0.15', '0.7')
        ),
        borderColor: Object.values(result.categories).map(c => STATUS_COLOR[c.status].border),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: '#94a3b8', boxWidth: 14, font: { size: 12 } } },
      tooltip: {
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` },
      },
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: '#64748b', callback: v => `$${v.toLocaleString()}` }, grid: { color: 'rgba(255,255,255,0.04)' } },
    },
  };

  const activeCategories = CATEGORIES.filter(c =>
    (budgets[c] !== undefined && budgets[c] !== '') || (actuals[c] !== undefined && actuals[c] !== '')
  );
  const inactiveCategories = CATEGORIES.filter(c => !activeCategories.includes(c));

  return (
    <div>
      {/* Header */}
      <div className="card">
        <h2 className="card-title">📋 Budget Planner</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>
          Set monthly budget limits per category, enter what you actually spent, and see where you stand.
        </p>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {[['budgets', '💰 Set Budgets'], ['actuals', '📝 Enter Actual Spending']].map(([id, label]) => (
            <button
              key={id}
              className={`btn ${editMode === id ? 'btn-primary' : ''}`}
              style={editMode !== id ? { background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' } : {}}
              onClick={() => setEditMode(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Category inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          {CATEGORIES.map(cat => {
            const val = editMode === 'budgets' ? (budgets[cat] ?? '') : (actuals[cat] ?? '');
            const setter = editMode === 'budgets' ? setField(budgets, saveBudgets) : setField(actuals, saveActuals);
            return (
              <div key={cat} className="form-group" style={{ flex: 'none' }}>
                <label>{cat}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', fontSize: '0.9rem' }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={val}
                    onChange={e => setter(cat, e.target.value)}
                    style={{ paddingLeft: '1.5rem' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={analyze} disabled={loading}>
            {loading ? '⏳ Analysing…' : '📊 Analyse Budget'}
          </button>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
            onClick={() => {
              const demo = { Housing: 1500, Utilities: 200, Groceries: 400, Dining: 300, Transport: 150, Entertainment: 100, Healthcare: 80, Shopping: 200 };
              const act  = { Housing: 1500, Utilities: 188, Groceries: 523, Dining: 274, Transport: 167, Entertainment: 142, Healthcare: 35, Shopping: 310 };
              saveBudgets(demo); saveActuals(act);
            }}
          >
            Load sample data
          </button>
        </div>
        {error && <div className="error-msg">{error}</div>}
      </div>

      {/* Results */}
      {hasData && (
        <>
          {/* Summary stats */}
          <div className="stats-grid">
            {[
              { label: 'Total Budget', value: fmt(result.total_budget) },
              { label: 'Total Spent',  value: fmt(result.total_actual), cls: result.total_actual > result.total_budget ? 'warning' : '' },
              { label: 'Remaining',    value: fmt(result.total_remaining), cls: result.total_remaining >= 0 ? 'success' : 'warning' },
              { label: 'Savings Rate', value: `${result.savings_rate_pct}%`, cls: result.savings_rate_pct >= 20 ? 'success' : result.savings_rate_pct > 0 ? 'warning' : '' },
              { label: 'Over Budget',  value: result.over_budget_categories.length === 0 ? '✅ None' : result.over_budget_categories.join(', '),
                cls: result.over_budget_categories.length > 0 ? 'warning' : 'success' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="stat-box">
                <div className="stat-label">{label}</div>
                <div className={`stat-value ${cls || ''}`} style={{ fontSize: result.over_budget_categories.length > 2 && label === 'Over Budget' ? '0.82rem' : undefined }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Per-category progress bars */}
          <div className="card">
            <h3 className="card-title">Category Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {Object.entries(result.categories)
                .sort((a, b) => b[1].pct_used - a[1].pct_used)
                .map(([cat, data]) => {
                  const colors = STATUS_COLOR[data.status];
                  const barPct = Math.min(data.pct_used, 110);
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.87rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{cat}</span>
                        <span style={{ color: colors.text }}>
                          {fmt(data.actual)} / {data.budget > 0 ? fmt(data.budget) : 'No budget'} ({data.pct_used}%)
                        </span>
                      </div>
                      <div style={{ background: 'var(--color-border)', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${barPct}%`,
                          height: '100%',
                          background: colors.border,
                          borderRadius: '99px',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                      {data.status === 'over' && (
                        <div style={{ fontSize: '0.76rem', color: '#ef4444', marginTop: '0.2rem' }}>
                          {fmt(Math.abs(data.remaining))} over budget
                        </div>
                      )}
                      {data.status === 'ok' && data.budget > 0 && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                          {fmt(data.remaining)} remaining
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Bar chart */}
          <div className="card">
            <h3 className="card-title">Budget vs Actual</h3>
            <Bar data={chartData} options={chartOptions} />
          </div>
        </>
      )}

      {/* Quick-add for unconfigured categories */}
      {inactiveCategories.length > 0 && (
        <div className="info-box" style={{ marginTop: '0.5rem' }}>
          <strong>Not configured:</strong>{' '}
          {inactiveCategories.join(', ')}. Enter values above to include them.
        </div>
      )}
    </div>
  );
}
