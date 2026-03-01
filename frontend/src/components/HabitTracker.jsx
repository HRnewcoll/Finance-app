import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const DEFAULT_HABITS = [
  'Exercise / workout',
  'Read for 30 minutes',
  'Meditate',
  'Drink 8 glasses of water',
  'No social media before noon',
  'Track expenses',
];

const MOODS = [
  { emoji: '😄', label: 'Great',    value: 5 },
  { emoji: '🙂', label: 'Good',     value: 4 },
  { emoji: '😐', label: 'Neutral',  value: 3 },
  { emoji: '😕', label: 'Low',      value: 2 },
  { emoji: '😞', label: 'Rough',    value: 1 },
];

const today = () => new Date().toISOString().slice(0, 10);
const STORAGE_KEY = 'finance_app_habits';

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export default function HabitTracker() {
  const [entries, setEntries] = useState(loadEntries);
  const [date, setDate] = useState(today());
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [newHabit, setNewHabit] = useState('');
  const [journal, setJournal] = useState('');
  const [mood, setMood] = useState(null);
  const [checked, setChecked] = useState({});
  const [summary, setSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  // Load existing entry when date changes
  useEffect(() => {
    const entry = entries[date] || {};
    setChecked(entry.checked || {});
    setJournal(entry.journal || '');
    setMood(entry.mood ?? null);
    setSummary(entry.summary || null);
    setSummaryError('');
  }, [date, entries]);

  const persistEntry = (patch) => {
    const updated = {
      ...entries,
      [date]: { ...(entries[date] || {}), ...patch },
    };
    setEntries(updated);
    saveEntries(updated);
  };

  const toggleHabit = (habit) => {
    const next = { ...checked, [habit]: !checked[habit] };
    setChecked(next);
    persistEntry({ checked: next });
  };

  const setMoodAndSave = (value) => {
    setMood(value);
    persistEntry({ mood: value });
  };

  const saveJournal = () => {
    persistEntry({ journal });
  };

  const summarizeJournal = async () => {
    if (!journal.trim()) return;
    setSummarizing(true);
    setSummaryError('');
    setSummary(null);
    try {
      const { data } = await axios.post(`${API}/api/summarize`, {
        text: journal,
        max_sentences: 3,
      });
      setSummary(data);
      persistEntry({ journal, summary: data });
    } catch {
      setSummaryError('Could not reach the summariser API. Is the backend running?');
    } finally {
      setSummarizing(false);
    }
  };

  const addHabit = () => {
    const trimmed = newHabit.trim();
    if (trimmed && !habits.includes(trimmed)) {
      setHabits(h => [...h, trimmed]);
      setNewHabit('');
    }
  };

  const completedCount = habits.filter(h => checked[h]).length;
  const completionPct = habits.length ? Math.round((completedCount / habits.length) * 100) : 0;

  // Last 7 days completion chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const entry = entries[key];
    if (!entry?.checked) return { key, pct: 0 };
    const done = habits.filter(h => entry.checked[h]).length;
    return { key, pct: habits.length ? Math.round((done / habits.length) * 100) : 0 };
  });

  const currentMood = MOODS.find(m => m.value === mood);

  return (
    <div>
      {/* Date picker */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h2 className="card-title" style={{ margin: 0 }}>✅ Habit &amp; Mood Tracker</h2>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={e => setDate(e.target.value)}
          style={{ marginLeft: 'auto' }}
        />
      </div>

      <div className="two-col">
        {/* Habits */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Daily Habits</h3>
            <span style={{ fontSize: '0.85rem', color: completionPct === 100 ? 'var(--color-success)' : 'var(--color-muted)' }}>
              {completedCount}/{habits.length} ({completionPct}%)
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ background: 'var(--color-border)', borderRadius: '99px', height: '6px', marginBottom: '1rem' }}>
            <div style={{
              background: completionPct === 100 ? 'var(--color-success)' : 'var(--color-primary)',
              width: `${completionPct}%`, height: '100%', borderRadius: '99px',
              transition: 'width 0.3s',
            }} />
          </div>

          <ul className="habit-list">
            {habits.map(habit => (
              <li key={habit} className="habit-item">
                <input
                  type="checkbox"
                  className="habit-cb"
                  checked={!!checked[habit]}
                  onChange={() => toggleHabit(habit)}
                  id={`habit-${habit}`}
                />
                <label htmlFor={`habit-${habit}`} style={{
                  fontSize: '0.92rem',
                  textDecoration: checked[habit] ? 'line-through' : 'none',
                  color: checked[habit] ? 'var(--color-muted)' : 'var(--color-text)',
                  cursor: 'pointer',
                }}>
                  {habit}
                </label>
              </li>
            ))}
          </ul>

          {/* Add habit */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="text"
              placeholder="Add a habit…"
              value={newHabit}
              onChange={e => setNewHabit(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHabit()}
            />
            <button className="btn btn-primary btn-sm" onClick={addHabit}>Add</button>
          </div>
        </div>

        {/* Mood */}
        <div className="card">
          <h3 className="card-title">Today's Mood</h3>
          <div className="mood-selector">
            {MOODS.map(m => (
              <button
                key={m.value}
                className={`mood-btn ${mood === m.value ? 'mood-btn--selected' : ''}`}
                title={m.label}
                onClick={() => setMoodAndSave(m.value)}
              >
                {m.emoji}
              </button>
            ))}
          </div>
          {currentMood && (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Feeling: <strong style={{ color: 'var(--color-text)' }}>{currentMood.label}</strong>
            </p>
          )}

          {/* 7-day streak */}
          <h4 style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: '1.25rem 0 0.5rem' }}>
            7-Day Habit Completion
          </h4>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '60px' }}>
            {last7.map(({ key, pct }) => (
              <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '100%',
                  height: `${Math.max(pct * 0.5, 4)}px`,
                  background: pct === 100 ? 'var(--color-success)' : pct > 0 ? 'var(--color-primary)' : 'var(--color-border)',
                  borderRadius: '4px 4px 0 0',
                }} />
                <span style={{ fontSize: '0.62rem', color: 'var(--color-muted)' }}>
                  {key.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Journal */}
      <div className="card">
        <h3 className="card-title">📝 Journal Entry</h3>
        <textarea
          placeholder="Write about your day — what happened, how you felt, what you're grateful for…"
          value={journal}
          onChange={e => setJournal(e.target.value)}
          style={{ marginBottom: '0.75rem', minHeight: '130px' }}
        />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={saveJournal}>
            💾 Save Entry
          </button>
          <button
            className="btn btn-success"
            onClick={summarizeJournal}
            disabled={summarizing || !journal.trim()}
          >
            {summarizing ? '⏳ Summarising…' : '✨ Auto-Summarise'}
          </button>
        </div>

        {summaryError && <div className="error-msg">{summaryError}</div>}

        {summary && (
          <div className="summary-box">
            <h4>✨ AI Summary <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>({summary.method})</span></h4>
            <p className="summary-text">{summary.summary}</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.5rem', marginBottom: 0 }}>
              {summary.word_count} words in original entry
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
