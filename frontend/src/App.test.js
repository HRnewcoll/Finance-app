import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Stub Chart.js to avoid canvas errors in jsdom
jest.mock('react-chartjs-2', () => ({
  Line:     () => <canvas data-testid="line-chart" />,
  Bar:      () => <canvas data-testid="bar-chart" />,
  Doughnut: () => <canvas data-testid="doughnut-chart" />,
}));

// Stub axios to avoid real network calls
jest.mock('axios');

describe('App navigation', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText(/Finance App/i)).toBeInTheDocument();
  });

  it('shows the Retirement Simulator tab by default', () => {
    render(<App />);
    expect(screen.getByText(/Retirement Simulator/i)).toBeInTheDocument();
    expect(screen.getByText(/Run Simulation/i)).toBeInTheDocument();
  });

  it('switches to Habit & Mood Tracker tab', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Habit & Mood Tracker/i));
    expect(screen.getByText(/Daily Habits/i)).toBeInTheDocument();
    expect(screen.getByText(/Journal Entry/i)).toBeInTheDocument();
  });

  it('switches to Expense Dashboard tab', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Expense Dashboard/i));
    expect(screen.getByText(/Expense Categorizer/i)).toBeInTheDocument();
    expect(screen.getByText(/Spending Forecast/i)).toBeInTheDocument();
  });
});

describe('RetirementSimulator', () => {
  it('renders all input fields', () => {
    render(<App />);
    // Labels text rendered in the DOM
    expect(screen.getByText(/Current Savings \(\$\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Contribution \(\$\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Age/i)).toBeInTheDocument();
    expect(screen.getByText(/Retirement Age/i)).toBeInTheDocument();
  });

  it('pre-fills sensible default values', () => {
    render(<App />);
    // spinbutton is the accessible role for number inputs
    const numInputs = screen.getAllByRole('spinbutton');
    // First two are current_savings (50000) and monthly_contribution (1000)
    expect(numInputs[0]).toHaveValue(50000);
    expect(numInputs[1]).toHaveValue(1000);
  });

  it('shows market preset buttons', () => {
    render(<App />);
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
    expect(screen.getByText('NASDAQ')).toBeInTheDocument();
  });
});

describe('HabitTracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders default habits', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Habit & Mood Tracker/i));
    expect(screen.getByText(/Exercise/i)).toBeInTheDocument();
    expect(screen.getByText(/Meditate/i)).toBeInTheDocument();
  });

  it('can check a habit', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Habit & Mood Tracker/i));
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('can add a new habit', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Habit & Mood Tracker/i));
    const input = screen.getByPlaceholderText(/Add a habit/i);
    fireEvent.change(input, { target: { value: 'Write in gratitude journal' } });
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText('Write in gratitude journal')).toBeInTheDocument();
  });

  it('renders mood selector emojis', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Habit & Mood Tracker/i));
    expect(screen.getByTitle('Great')).toBeInTheDocument();
    expect(screen.getByTitle('Rough')).toBeInTheDocument();
  });

  it('shows Auto-Summarise button', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Habit & Mood Tracker/i));
    expect(screen.getByText(/Auto-Summarise/i)).toBeInTheDocument();
  });
});

describe('ExpenseDashboard', () => {
  it('renders description and amount inputs', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Expense Dashboard/i));
    expect(screen.getByPlaceholderText(/Whole Foods/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('can add an expense and see it in the table', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Expense Dashboard/i));
    fireEvent.change(screen.getByPlaceholderText(/Whole Foods/i), {
      target: { value: 'Netflix subscription' },
    });
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '15.99' },
    });
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getByText('Netflix subscription')).toBeInTheDocument();
    expect(screen.getByText('$15.99')).toBeInTheDocument();
  });

  it('loads sample data', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Expense Dashboard/i));
    fireEvent.click(screen.getByText(/Load sample data/i));
    expect(screen.getByText(/Monthly rent payment/i)).toBeInTheDocument();
  });

  it('shows forecast section', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Expense Dashboard/i));
    expect(screen.getByText(/Spending Forecast/i)).toBeInTheDocument();
    expect(screen.getByText(/🔮 Forecast/i)).toBeInTheDocument();
  });
});
