# Finance-app

AI-powered personal finance & productivity tools built with React + Chart.js (frontend) and Python Flask (backend).

## Features

### 📈 Retirement / Investment Simulator
- Monte Carlo simulation (up to 2 000 portfolio paths)
- Real market return data via **yfinance** (S&P 500, NASDAQ, Dow Jones, Bonds) with a static fallback
- Configurable: current savings, monthly contribution, age, expected return, volatility, inflation
- Displays 10th / 25th / 50th / 75th / 90th percentile bands on a Chart.js line chart
- Summary stats: median, real (inflation-adjusted) median, probability of reaching $1 M+

### ✅ Habit & Mood Tracker
- Configurable daily habit checklist with progress bar
- Emoji mood selector (persisted to `localStorage` per day)
- Daily journal with **auto-summarise** (extractive NLP, no API key needed; optional OpenAI upgrade)
- 7-day habit completion mini bar chart

### 💰 Expense Categorizer + Forecasting Dashboard
- Free-text expense entry auto-categorised into 12 categories (Housing, Groceries, Dining, Transport, Entertainment…)
- Doughnut + bar charts via Chart.js
- 3-month spending forecast using linear regression with confidence bands

## Screenshots

**Retirement Simulator (Monte Carlo)**
![Retirement Simulator](https://github.com/user-attachments/assets/99fc8f3d-7687-4816-853c-efa058612e17)

**Habit & Mood Tracker**
![Habit Tracker](https://github.com/user-attachments/assets/1d9545df-8d58-4305-af98-ad23af868387)

**Expense Dashboard**
![Expense Dashboard](https://github.com/user-attachments/assets/8740bdbf-2507-4c5f-b8f7-1992f22a9971)

## Getting Started

### Backend (Python 3.12+)
```bash
cd backend
pip install -r requirements.txt
python app.py          # runs on http://localhost:5000
```

### Frontend (Node 18+)
```bash
cd frontend
npm install
npm start              # runs on http://localhost:3000
```

### Tests
```bash
# Backend (32 tests)
cd backend && python -m pytest test_backend.py -v

# Frontend (16 tests)
cd frontend && npm test
```

## Architecture
```
Finance-app/
├── backend/
│   ├── app.py              # Flask REST API
│   ├── monte_carlo.py      # Monte Carlo simulation engine
│   ├── market_data.py      # yfinance market data scraping + fallback
│   ├── expense.py          # Keyword categoriser + linear-regression forecaster
│   ├── summarizer.py       # Extractive TF-IDF summariser (+ optional OpenAI)
│   ├── test_backend.py     # 32 pytest tests
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── App.css
    │   ├── App.test.js     # 16 React Testing Library tests
    │   └── components/
    │       ├── RetirementSimulator.jsx
    │       ├── HabitTracker.jsx
    │       └── ExpenseDashboard.jsx
    └── package.json
```
