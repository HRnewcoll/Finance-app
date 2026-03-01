import React, { useState } from 'react';
import RetirementSimulator from './components/RetirementSimulator';
import HabitTracker from './components/HabitTracker';
import ExpenseDashboard from './components/ExpenseDashboard';
import './App.css';

const TABS = [
  { id: 'retirement', label: '📈 Retirement Simulator' },
  { id: 'habits',     label: '✅ Habit & Mood Tracker' },
  { id: 'expenses',   label: '💰 Expense Dashboard' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('retirement');

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">💼 Finance App</h1>
        <p className="app-subtitle">AI-powered personal finance &amp; productivity tools</p>
        <nav className="tab-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">
        {activeTab === 'retirement' && <RetirementSimulator />}
        {activeTab === 'habits'     && <HabitTracker />}
        {activeTab === 'expenses'   && <ExpenseDashboard />}
      </main>
    </div>
  );
}
