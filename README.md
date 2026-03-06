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

### 📋 Budget Planner
- Set monthly budget limits for 11 spending categories
- Enter actual spending and compare against budgets
- Colour-coded progress bars per category: green (≤75%), amber (76–100%), red (over budget)
- Summary stats: total budget, total spent, remaining, savings rate, over-budget categories
- Budget vs Actual grouped bar chart
- All data persisted to `localStorage`

### 🏦 Net Worth Tracker
- Add and manage assets (Checking, Savings, Investments, Retirement, Real Estate, Vehicle…)
- Add and manage liabilities (Credit Card, Mortgage, Student Loan, Auto Loan…)
- Live net worth calculation = total assets − total liabilities
- Debt-to-asset ratio indicator
- **Snapshot** your net worth at any point in time and view the full history in a sortable table
- Line chart showing net worth trend over time (needs ≥ 2 snapshots)
- All data persisted to `localStorage`

## Screenshots

**Retirement Simulator (Monte Carlo)**
![Retirement Simulator](https://github.com/user-attachments/assets/99fc8f3d-7687-4816-853c-efa058612e17)

**Habit & Mood Tracker**
![Habit Tracker](https://github.com/user-attachments/assets/1d9545df-8d58-4305-af98-ad23af868387)

**Expense Dashboard**
![Expense Dashboard](https://github.com/user-attachments/assets/8740bdbf-2507-4c5f-b8f7-1992f22a9971)

**Budget Planner**
![Budget Planner](https://github.com/user-attachments/assets/18ada4a5-940e-4ee6-85af-9cce28be96ee)

**Net Worth Tracker**
![Net Worth Tracker](https://github.com/user-attachments/assets/190b1fae-ba11-44fc-b319-987d094bbcbc)

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
# Backend (42 tests)
cd backend && python -m pytest test_backend.py -v

# Frontend (26 tests)
cd frontend && npm test
```

## Architecture
```
Finance-app/
├── backend/
│   ├── app.py              # Flask REST API (8 endpoints)
│   ├── monte_carlo.py      # Monte Carlo simulation engine
│   ├── market_data.py      # yfinance market data scraping + fallback
│   ├── expense.py          # Keyword categoriser + linear-regression forecaster
│   ├── budget.py           # Budget vs actual analysis + savings rate
│   ├── summarizer.py       # Extractive TF-IDF summariser (+ optional OpenAI)
│   ├── test_backend.py     # 42 pytest tests
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── App.css
    │   ├── App.test.js     # 26 React Testing Library tests
    │   └── components/
    │       ├── RetirementSimulator.jsx
    │       ├── HabitTracker.jsx
    │       ├── ExpenseDashboard.jsx
    │       ├── BudgetPlanner.jsx
    │       └── NetWorthTracker.jsx
    └── package.json
A monorepo for the Finance application, equipped with production-grade DevOps tooling:
pre-commit hooks, conventional commits enforcement, auto-changelog, a monorepo
management CLI, security scanning on every PR, and reusable Copilot Agent Skills.

---

## Table of Contents

- [Repository Structure](#repository-structure)
- [Git Workflow Enforcer](#git-workflow-enforcer)
- [Monorepo Management CLI](#monorepo-management-cli)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Copilot Agent Skills](#copilot-agent-skills)
- [Getting Started](#getting-started)

---

## Repository Structure

```
Finance-app/
├── .github/
│   ├── workflows/
│   │   ├── security-scan.yml          # Security & compliance scanner (runs on every PR)
│   │   ├── conventional-commits.yml   # PR title & commit message validator
│   │   └── auto-changelog.yml         # Auto-generates CHANGELOG.md on merge
│   └── copilot/skills/
│       ├── kubernetes-debugging.md    # K8s debugging playbook skill
│       ├── react-best-practices.md    # React component library enforcer skill
│       ├── python-to-rust.md          # Python → Rust migration assistant skill
│       └── openapi-client-gen.md      # OpenAPI client + test generator skill
├── scripts/
│   ├── cli.py                         # Monorepo management CLI
│   └── templates/
│       └── go-microservice/           # Go + protobuf microservice scaffold template
├── services/                          # Scaffolded microservices land here
├── .pre-commit-config.yaml            # Pre-commit hooks
├── commitlint.config.js               # Conventional commits rules
├── package.json                       # Node.js tooling (commitlint, husky, changelog)
├── pyproject.toml                     # Python tooling config (bandit, black, isort)
├── .secrets.baseline                  # detect-secrets baseline
└── CHANGELOG.md                       # Auto-generated changelog
```

---

## Git Workflow Enforcer

### Pre-commit Hooks

Install and enable the hooks locally:

```bash
pip install pre-commit
pre-commit install          # Install commit hooks
pre-commit install --hook-type commit-msg  # Install commit-msg hook
```

Run against all files manually:

```bash
pre-commit run --all-files
```

The hooks enforce:

| Hook | What it checks |
|------|----------------|
| `conventional-pre-commit` | Commit message follows [Conventional Commits](https://www.conventionalcommits.org/) |
| `trailing-whitespace` | No trailing whitespace |
| `end-of-file-fixer` | Files end with a newline |
| `check-yaml` / `check-json` / `check-toml` | Config file syntax |
| `detect-private-key` | No private keys committed |
| `detect-secrets` | No secrets committed (uses `.secrets.baseline`) |
| `bandit` | Python security issues |
| `black` + `isort` | Python formatting |
| `go-fmt` + `go-vet` | Go formatting and correctness |
| `hadolint` | Dockerfile best practices |
| `markdownlint` | Markdown style |

### Conventional Commits

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

**Valid types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Examples:**

```bash
git commit -m "feat(auth): add JWT token refresh endpoint"
git commit -m "fix: resolve null pointer in transaction processor"
git commit -m "docs: update payment service API documentation"
git commit -m "chore(deps): bump lodash from 4.17.20 to 4.17.21"
```

Use the interactive commit helper (recommended):

```bash
npm install    # install tooling
npm run commit # interactive conventional commit wizard
```

### Auto-Changelog

The changelog is automatically updated when commits are merged to `main`:

```bash
# Update CHANGELOG.md locally
npm run changelog

# Create a release (patch/minor/major)
npm run release           # patch bump
npm run release:minor     # minor bump
npm run release:major     # major bump
```

---

## Monorepo Management CLI

Scaffold, list, and validate microservices with the CLI:

```bash
# Scaffold a new Go gRPC microservice
python scripts/cli.py scaffold --name payment-processor --lang go --type microservice

# Scaffold a Go gRPC service
python scripts/cli.py scaffold --name user-auth --lang go --type grpc-service

# List all services
python scripts/cli.py list

# Validate a service against monorepo standards
python scripts/cli.py validate payment-processor
```

### Scaffolded Go Microservice Structure

```
services/payment-processor/
├── cmd/server/main.go          # Entry point (gRPC server)
├── proto/service.proto         # Protobuf service definition
├── api/                        # Generated gRPC stubs (make proto)
├── internal/
│   ├── handler/handler.go      # gRPC handlers (transport layer)
│   ├── service/service.go      # Business logic
│   └── repository/             # Data access (add your own)
├── Makefile                    # make proto / build / test / docker-build
├── Dockerfile                  # Multi-stage scratch image
└── README.md
```

After scaffolding, run:

```bash
cd services/payment-processor
go mod tidy
make proto          # Generate protobuf stubs
make test           # Run tests
make run            # Start locally on :50051
make docker-build   # Build Docker image
```

---

## GitHub Actions Workflows

### Security & Compliance Scanner (`security-scan.yml`)

Runs on **every pull request** and on pushes to `main`/`master`.

| Job | Tool | What it checks |
|-----|------|----------------|
| Secret Detection | `detect-secrets` | Exposed API keys, passwords, tokens |
| Python Security | `bandit` | Python code security issues (high severity) |
| Dependency Scan | `safety` + `npm audit` | Known CVEs in dependencies |
| SAST | `semgrep` | Static analysis for common vulnerability patterns |
| License Check | `pip-licenses` + `license-checker` | GPL/LGPL dependencies |
| Docker Scan | `trivy` | High/Critical Dockerfile misconfigurations |

### Conventional Commits Checker (`conventional-commits.yml`)

Runs on every **pull request open/edit/sync**.

- Validates the PR **title** follows Conventional Commits
- Validates **every commit** in the PR follows Conventional Commits
- Posts a friendly bot comment explaining the format if validation fails

### Auto-Changelog (`auto-changelog.yml`)

- Automatically updates `CHANGELOG.md` on every push to `main`
- Can be manually triggered to create a versioned GitHub Release:
  1. Go to **Actions → Auto-Changelog → Run workflow**
  2. Select release type: `patch`, `minor`, or `major`

---

## Copilot Agent Skills

Reusable prompt + tool bundles in `.github/copilot/skills/`:

| Skill | File | Description |
|-------|------|-------------|
| **Kubernetes Debugging Playbook** | `kubernetes-debugging.md` | Step-by-step K8s diagnosis guide |
| **React Best Practices Enforcer** | `react-best-practices.md` | Component quality checklist + code review guide |
| **Python → Rust Migration Assistant** | `python-to-rust.md` | Pattern mapping, recommended crates, migration checklist |
| **OpenAPI Client Generator** | `openapi-client-gen.md` | Generate typed clients + tests from OpenAPI specs |

To invoke a skill in GitHub Copilot Chat:

```
@workspace /skill kubernetes-debugging
My pod is stuck in CrashLoopBackOff. Here are the logs: ...
```

---

## Getting Started

### 1. Install local tooling

```bash
# Python tools (pre-commit, bandit, etc.)
pip install pre-commit bandit detect-secrets

# Node.js tools (commitlint, husky, changelog)
npm install

# Enable git hooks
pre-commit install
pre-commit install --hook-type commit-msg
```

### 2. Create your first microservice

```bash
python scripts/cli.py scaffold --name my-service --lang go --type microservice
```

### 3. Make a conventional commit

```bash
npm run commit   # interactive wizard
# or manually:
git commit -m "feat(my-service): initial scaffold"
```
