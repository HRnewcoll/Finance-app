import React, { useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const STORAGE_KEY = 'finance_app_networth';

const ASSET_TYPES = [
  'Cash / Checking', 'Savings Account', 'Investments / Brokerage',
  'Retirement (401k / IRA)', 'Real Estate', 'Vehicle', 'Other Asset',
];
const LIABILITY_TYPES = [
  'Credit Card', 'Mortgage', 'Student Loan',
  'Auto Loan', 'Personal Loan', 'Other Debt',
];

const fmt = v => {
  const n = Math.abs(+v || 0);
  const s = n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return +v < 0 ? `-${s}` : s;
};

const today = () => new Date().toISOString().slice(0, 10);
const newId  = () => Math.random().toString(36).slice(2, 9);

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch { return null; }
}

function saveState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const DEMO_STATE = {
  assets: [
    { id: 'a1', name: 'Chase Checking',     type: 'Cash / Checking',            value: 5200 },
    { id: 'a2', name: 'Marcus Savings',     type: 'Savings Account',             value: 18000 },
    { id: 'a3', name: 'Vanguard Brokerage', type: 'Investments / Brokerage',     value: 42000 },
    { id: 'a4', name: 'Fidelity 401k',      type: 'Retirement (401k / IRA)',     value: 87000 },
    { id: 'a5', name: 'Primary Residence',  type: 'Real Estate',                 value: 320000 },
  ],
  liabilities: [
    { id: 'l1', name: 'Visa Credit Card',   type: 'Credit Card',                 balance: 3400 },
    { id: 'l2', name: 'Home Mortgage',      type: 'Mortgage',                    balance: 241000 },
    { id: 'l3', name: 'Student Loans',      type: 'Student Loan',                balance: 18500 },
  ],
  snapshots: [],
};

export default function NetWorthTracker() {
  const [state, setState] = useState(() => loadState() || {
    assets: [], liabilities: [], snapshots: [],
  });

  const update = useCallback(next => { setState(next); saveState(next); }, []);

  const totalAssets      = state.assets.reduce((s, a) => s + (+a.value  || 0), 0);
  const totalLiabilities = state.liabilities.reduce((s, l) => s + (+l.balance || 0), 0);
  const netWorth         = totalAssets - totalLiabilities;

  // ── Asset helpers ──────────────────────────────────────────────────────
  const addAsset = () => update({
    ...state,
    assets: [...state.assets, { id: newId(), name: '', type: ASSET_TYPES[0], value: '' }],
  });

  const updateAsset = (id, field, val) => update({
    ...state,
    assets: state.assets.map(a => a.id === id ? { ...a, [field]: val } : a),
  });

  const removeAsset = id => update({ ...state, assets: state.assets.filter(a => a.id !== id) });

  // ── Liability helpers ─────────────────────────────────────────────────
  const addLiability = () => update({
    ...state,
    liabilities: [...state.liabilities, { id: newId(), name: '', type: LIABILITY_TYPES[0], balance: '' }],
  });

  const updateLiability = (id, field, val) => update({
    ...state,
    liabilities: state.liabilities.map(l => l.id === id ? { ...l, [field]: val } : l),
  });

  const removeLiability = id => update({ ...state, liabilities: state.liabilities.filter(l => l.id !== id) });

  // ── Snapshots ─────────────────────────────────────────────────────────
  const takeSnapshot = () => {
    const snap = { date: today(), netWorth: Math.round(netWorth * 100) / 100, assets: totalAssets, liabilities: totalLiabilities };
    // Replace same-day snapshot
    const snaps = state.snapshots.filter(s => s.date !== snap.date);
    update({ ...state, snapshots: [...snaps, snap].sort((a, b) => a.date.localeCompare(b.date)) });
  };

  const deleteSnapshot = date => update({ ...state, snapshots: state.snapshots.filter(s => s.date !== date) });

  // ── Chart ─────────────────────────────────────────────────────────────
  const chartData = state.snapshots.length >= 2
    ? {
        labels: state.snapshots.map(s => s.date),
        datasets: [
          {
            label: 'Net Worth',
            data: state.snapshots.map(s => s.netWorth),
            borderColor: '#6c63ff',
            backgroundColor: 'rgba(108,99,255,0.12)',
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#6c63ff',
            fill: true,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: ctx => ` Net Worth: ${fmt(ctx.parsed.y)}` },
      },
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: {
        ticks: { color: '#64748b', callback: v => fmt(v) },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
    },
  };

  const nwColor = netWorth >= 0 ? 'var(--color-success)' : '#ef4444';

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="card-title" style={{ margin: 0 }}>🏦 Net Worth Tracker</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', margin: '0.3rem 0 0' }}>
            Track all assets &amp; liabilities. Snapshot your progress over time.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>Current Net Worth</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: nwColor }}>{fmt(netWorth)}</div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">Total Assets</div>
          <div className="stat-value success">{fmt(totalAssets)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Total Liabilities</div>
          <div className="stat-value warning">{fmt(totalLiabilities)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Debt-to-Asset Ratio</div>
          <div className={`stat-value ${totalAssets > 0 && totalLiabilities / totalAssets < 0.4 ? 'success' : 'warning'}`}>
            {totalAssets > 0 ? `${(totalLiabilities / totalAssets * 100).toFixed(1)}%` : '—'}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Snapshots</div>
          <div className="stat-value">{state.snapshots.length}</div>
        </div>
      </div>

      <div className="two-col">
        {/* Assets */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>💚 Assets</h3>
            <button className="btn btn-sm btn-success" onClick={addAsset}>+ Add Asset</button>
          </div>

          {state.assets.length === 0 && (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem' }}>No assets yet. Click "+ Add Asset" to get started.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {state.assets.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Name"
                  value={a.name}
                  onChange={e => updateAsset(a.id, 'name', e.target.value)}
                  style={{ flex: 2 }}
                />
                <select
                  value={a.type}
                  onChange={e => updateAsset(a.id, 'type', e.target.value)}
                  style={{ flex: 2 }}
                >
                  {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <div style={{ position: 'relative', flex: 1.5 }}>
                  <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', fontSize: '0.85rem' }}>$</span>
                  <input
                    type="number" min="0" step="100"
                    placeholder="0"
                    value={a.value}
                    onChange={e => updateAsset(a.id, 'value', e.target.value)}
                    style={{ paddingLeft: '1.4rem' }}
                  />
                </div>
                <button
                  className="btn btn-sm"
                  style={{ background: 'none', color: 'var(--color-danger)', padding: '0.3rem 0.5rem', minWidth: 28 }}
                  onClick={() => removeAsset(a.id)}
                >✕</button>
              </div>
            ))}
          </div>

          {state.assets.length > 0 && (
            <div style={{ marginTop: '0.75rem', textAlign: 'right', fontSize: '0.88rem', color: 'var(--color-success)', fontWeight: 600 }}>
              Total: {fmt(totalAssets)}
            </div>
          )}
        </div>

        {/* Liabilities */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>🔴 Liabilities</h3>
            <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }} onClick={addLiability}>
              + Add Debt
            </button>
          </div>

          {state.liabilities.length === 0 && (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem' }}>No liabilities. Debt-free! 🎉</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {state.liabilities.map(l => (
              <div key={l.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Name"
                  value={l.name}
                  onChange={e => updateLiability(l.id, 'name', e.target.value)}
                  style={{ flex: 2 }}
                />
                <select
                  value={l.type}
                  onChange={e => updateLiability(l.id, 'type', e.target.value)}
                  style={{ flex: 2 }}
                >
                  {LIABILITY_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <div style={{ position: 'relative', flex: 1.5 }}>
                  <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', fontSize: '0.85rem' }}>$</span>
                  <input
                    type="number" min="0" step="100"
                    placeholder="0"
                    value={l.balance}
                    onChange={e => updateLiability(l.id, 'balance', e.target.value)}
                    style={{ paddingLeft: '1.4rem' }}
                  />
                </div>
                <button
                  className="btn btn-sm"
                  style={{ background: 'none', color: 'var(--color-danger)', padding: '0.3rem 0.5rem', minWidth: 28 }}
                  onClick={() => removeLiability(l.id)}
                >✕</button>
              </div>
            ))}
          </div>

          {state.liabilities.length > 0 && (
            <div style={{ marginTop: '0.75rem', textAlign: 'right', fontSize: '0.88rem', color: '#ef4444', fontWeight: 600 }}>
              Total: {fmt(totalLiabilities)}
            </div>
          )}
        </div>
      </div>

      {/* Snapshot section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>📸 Net Worth History</h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={takeSnapshot} disabled={state.assets.length === 0 && state.liabilities.length === 0}>
              📸 Take Snapshot
            </button>
            <button
              className="btn btn-sm"
              style={{ background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
              onClick={() => update({ ...DEMO_STATE })}
            >
              Load demo data
            </button>
          </div>
        </div>

        {state.snapshots.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem' }}>
            No snapshots yet. Add assets / liabilities above and click "Take Snapshot" to record today's net worth.
          </p>
        ) : (
          <>
            {/* Snapshot table */}
            <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
              <table className="expense-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Assets</th>
                    <th>Liabilities</th>
                    <th>Net Worth</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...state.snapshots].reverse().map(s => (
                    <tr key={s.date}>
                      <td>{s.date}</td>
                      <td style={{ color: 'var(--color-success)' }}>{fmt(s.assets)}</td>
                      <td style={{ color: '#ef4444' }}>{fmt(s.liabilities)}</td>
                      <td style={{ fontWeight: 700, color: s.netWorth >= 0 ? 'var(--color-success)' : '#ef4444' }}>{fmt(s.netWorth)}</td>
                      <td>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'none', color: 'var(--color-danger)', padding: '0.2rem 0.5rem' }}
                          onClick={() => deleteSnapshot(s.date)}
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Line chart */}
            {chartData ? (
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--color-muted)', margin: '0 0 1rem' }}>Net Worth Over Time</h4>
                <Line data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="info-box">Add at least 2 snapshots to see the trend chart.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
