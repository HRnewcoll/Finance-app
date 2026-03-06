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
  it('switches to Budget Planner tab', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Budget Planner/i));
    expect(screen.getByText(/Set monthly budget limits/i)).toBeInTheDocument();
    expect(screen.getByText(/Analyse Budget/i)).toBeInTheDocument();
  });

  it('switches to Net Worth tab', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Net Worth/i));
    expect(screen.getByText(/Net Worth Tracker/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Take Snapshot/i })).toBeInTheDocument();
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

describe('BudgetPlanner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders all category inputs', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Budget Planner/i));
    expect(screen.getByText('Housing')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Dining')).toBeInTheDocument();
  });

  it('has Set Budgets and Enter Actual Spending tabs', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Budget Planner/i));
    expect(screen.getByText(/Set Budgets/i)).toBeInTheDocument();
    expect(screen.getByText(/Enter Actual Spending/i)).toBeInTheDocument();
  });

  it('loads sample data', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Budget Planner/i));
    // There are multiple "Load sample data" buttons across different tabs,
    // find the one in Budget Planner context
    const sampleBtns = screen.getAllByText(/Load sample data/i);
    fireEvent.click(sampleBtns[0]);
    // After loading, some Housing input should be populated
    const inputs = screen.getAllByRole('spinbutton');
    const nonEmpty = inputs.filter(i => i.value !== '' && i.value !== '0');
    expect(nonEmpty.length).toBeGreaterThan(0);
  });
});

describe('NetWorthTracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders assets and liabilities sections', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Net Worth/i));
    expect(screen.getByText(/💚 Assets/i)).toBeInTheDocument();
    expect(screen.getByText(/🔴 Liabilities/i)).toBeInTheDocument();
  });

  it('shows Add Asset and Add Debt buttons', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Net Worth/i));
    expect(screen.getByRole('button', { name: /\+ Add Asset/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Add Debt/i })).toBeInTheDocument();
  });

  it('can add an asset', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Net Worth/i));
    fireEvent.click(screen.getByRole('button', { name: /\+ Add Asset/i }));
    const nameInputs = screen.getAllByPlaceholderText('Name');
    expect(nameInputs.length).toBeGreaterThan(0);
    fireEvent.change(nameInputs[0], { target: { value: 'Chase Savings' } });
    expect(screen.getByDisplayValue('Chase Savings')).toBeInTheDocument();
  });

  it('loads demo data', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Net Worth/i));
    fireEvent.click(screen.getByText(/Load demo data/i));
    // Asset and liability names render as input values
    expect(screen.getByDisplayValue('Chase Checking')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Home Mortgage')).toBeInTheDocument();
  });

  it('shows net worth history section', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Net Worth/i));
    expect(screen.getByText(/Net Worth History/i)).toBeInTheDocument();
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
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

test("renders home page with three tool cards", () => {
  render(<App />);
  expect(screen.getByText(/Accessibility Mini-Apps/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /Colour Contrast Checker/i })).toBeInTheDocument();
  expect(screen.getAllByText(/ARIA Validator/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Image Describer/i).length).toBeGreaterThan(0);
});

test("navigation renders Colour Contrast page", async () => {
  render(<App />);
  const nav = screen.getByRole("navigation", { name: /Main navigation/i });
  await userEvent.click(within(nav).getByRole("link", { name: /Colour Contrast/i }));
  expect(await screen.findByRole("heading", { name: /Colour Contrast Checker/i })).toBeInTheDocument();
});

test("navigation renders ARIA Validator page", async () => {
  render(<App />);
  const nav = screen.getByRole("navigation", { name: /Main navigation/i });
  await userEvent.click(within(nav).getByRole("link", { name: /ARIA Validator/i }));
  expect(await screen.findByRole("heading", { name: /ARIA Validator/i })).toBeInTheDocument();
});

test("navigation renders Image Describer page", async () => {
  render(<App />);
  const nav = screen.getByRole("navigation", { name: /Main navigation/i });
  await userEvent.click(within(nav).getByRole("link", { name: /Image Describer/i }));
  expect(await screen.findByRole("heading", { name: /Image Describer/i })).toBeInTheDocument();
});

test("skip link is present", () => {
  render(<App />);
  expect(screen.getByText(/Skip to main content/i)).toBeInTheDocument();
});
