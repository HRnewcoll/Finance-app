# Agent Skill: Python → Rust Migration Assistant

## Skill Metadata

- **Name**: python-to-rust
- **Domain**: Language Migration / Performance Engineering
- **Version**: 1.0.0
- **Tags**: python, rust, migration, performance, safety, systems-programming

---

## Description

A reusable Copilot skill that guides Python-to-Rust migrations.
Use when a Python service or module needs higher performance, lower memory
usage, or stronger safety guarantees. The skill provides idiomatic Rust
equivalents for common Python patterns and a migration checklist.

---

## System Prompt

You are an expert in both Python and Rust. When migrating Python code to Rust,
produce idiomatic, safe Rust that follows the Rust API Guidelines. Explain
ownership, borrowing, and lifetime concepts when relevant. Prefer the standard
library over external crates when possible. When crates are needed, prefer
well-maintained ones from crates.io with high download counts.

---

## Pattern Mapping

### Data Types

| Python | Rust |
|--------|------|
| `int` | `i64` / `i32` / `usize` |
| `float` | `f64` |
| `str` | `&str` (borrowed) / `String` (owned) |
| `bytes` | `&[u8]` / `Vec<u8>` |
| `list[T]` | `Vec<T>` |
| `dict[K, V]` | `HashMap<K, V>` / `BTreeMap<K, V>` |
| `set[T]` | `HashSet<T>` |
| `Optional[T]` | `Option<T>` |
| `T \| Exception` | `Result<T, E>` |
| `tuple[A, B]` | `(A, B)` |
| `dataclass` | `struct` |
| `Enum` | `enum` |

### Error Handling

```python
# Python
try:
    result = parse_amount("abc")
except ValueError as e:
    print(f"Parse error: {e}")
```

```rust
// Rust – idiomatic Result propagation
use std::num::ParseFloatError;

fn parse_amount(s: &str) -> Result<f64, ParseFloatError> {
    s.parse::<f64>()
}

// Caller
match parse_amount("abc") {
    Ok(amount) => println!("Amount: {amount}"),
    Err(e) => eprintln!("Parse error: {e}"),
}

// Or with ? operator
fn process(s: &str) -> Result<(), Box<dyn std::error::Error>> {
    let amount = parse_amount(s)?;
    println!("Amount: {amount}");
    Ok(())
}
```

### Classes → Structs + impl

```python
# Python
@dataclass
class Transaction:
    id: str
    amount: float
    currency: str

    def to_cents(self) -> int:
        return int(self.amount * 100)
```

```rust
// Rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub amount: f64,
    pub currency: String,
}

impl Transaction {
    pub fn new(id: impl Into<String>, amount: f64, currency: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            amount,
            currency: currency.into(),
        }
    }

    pub fn to_cents(&self) -> i64 {
        (self.amount * 100.0).round() as i64
    }
}
```

### Iterators & Comprehensions

```python
# Python
total = sum(t.amount for t in transactions if t.currency == "USD")
ids = [t.id for t in transactions[:10]]
```

```rust
// Rust – zero-cost iterators
let total: f64 = transactions
    .iter()
    .filter(|t| t.currency == "USD")
    .map(|t| t.amount)
    .sum();

let ids: Vec<&str> = transactions
    .iter()
    .take(10)
    .map(|t| t.id.as_str())
    .collect();
```

### Async/Await

```python
# Python (asyncio)
import asyncio
import httpx

async def fetch_rate(from_currency: str, to_currency: str) -> float:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://api.example.com/rate/{from_currency}/{to_currency}")
        resp.raise_for_status()
        return resp.json()["rate"]
```

```rust
// Rust (tokio + reqwest)
use reqwest::Client;
use serde::Deserialize;

#[derive(Deserialize)]
struct RateResponse {
    rate: f64,
}

async fn fetch_rate(client: &Client, from: &str, to: &str) -> Result<f64, reqwest::Error> {
    let url = format!("https://api.example.com/rate/{from}/{to}");
    let resp: RateResponse = client
        .get(&url)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    Ok(resp.rate)
}
```

### Threading / Concurrency

```python
# Python – GIL-limited threads
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(process_item, items))
```

```rust
// Rust – true parallelism with rayon
use rayon::prelude::*;

let results: Vec<_> = items
    .par_iter()           // parallel iterator
    .map(process_item)
    .collect();
```

---

## Migration Checklist

### Before You Start

- [ ] Profile the Python code to confirm the bottleneck (don't guess!)
- [ ] Write comprehensive Python tests to validate behavior
- [ ] Identify the correct Rust equivalent types for all data structures
- [ ] Choose between full migration vs. Python extension (PyO3/Maturin)

### During Migration

- [ ] Start with pure-function modules (easiest to port and test)
- [ ] Use `thiserror` for library errors, `anyhow` for application errors
- [ ] Replace `print()` / `logging` with `tracing` crate
- [ ] Replace `requests`/`httpx` with `reqwest`
- [ ] Replace `pydantic` models with `serde` + `validator`
- [ ] Replace `pytest` with `#[test]` + `proptest` for property testing
- [ ] Enable `#![deny(clippy::all)]` from day one

### Recommended Crates

| Python Library | Rust Equivalent |
|---------------|-----------------|
| `requests` / `httpx` | `reqwest` |
| `pydantic` | `serde` + `validator` |
| `sqlalchemy` | `sqlx` / `diesel` |
| `redis` | `redis` crate |
| `celery` | `apalis` |
| `pytest` | `cargo test` + `rstest` |
| `hypothesis` | `proptest` |
| `logging` | `tracing` |
| `click` / `argparse` | `clap` |
| `dotenv` | `dotenvy` |

### Post-Migration Validation

- [ ] Benchmark with `criterion` to confirm performance improvement
- [ ] Fuzz test critical parsing logic with `cargo-fuzz`
- [ ] Run `cargo clippy -- -D warnings` with zero warnings
- [ ] Run `cargo audit` to check for dependency vulnerabilities
- [ ] Check memory usage with `valgrind` or `heaptrack`

---

## Response Template

When asked to migrate Python code to Rust:

1. **Analyse** the Python code for patterns, dependencies, and edge cases
2. **Map** Python types to Rust equivalents (show a table if complex)
3. **Produce** idiomatic Rust with explanatory comments
4. **Highlight** Rust-specific concerns (ownership, lifetimes, error handling)
5. **Suggest** tests using Rust's native testing framework

---

## Related Skills

- `openapi-client-gen` – generate type-safe clients from specs in both Python and Rust
- `kubernetes-debugging` – diagnose the deployed Rust service
