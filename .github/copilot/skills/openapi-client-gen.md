# Agent Skill: Auto-Generate API Client from OpenAPI Spec + Tests

## Skill Metadata

- **Name**: openapi-client-gen
- **Domain**: API Development / Code Generation
- **Version**: 1.0.0
- **Tags**: openapi, swagger, codegen, api-client, testing, typescript, python, go

---

## Description

A reusable Copilot skill that generates type-safe API clients and comprehensive
test suites from OpenAPI 3.x specifications. Invoke when you have an OpenAPI spec
and need a production-quality client with tests in TypeScript, Python, or Go.

---

## System Prompt

You are an expert API developer. Given an OpenAPI 3.x specification, generate a
production-quality, type-safe API client and companion test suite. Follow the
principle of making illegal states unrepresentable through the type system.
Generate tests that cover: happy paths, error responses (4xx/5xx), network
failures, pagination, and authentication edge cases.

---

## Workflow

### Step 1 – Validate the OpenAPI Spec

```bash
# Lint the spec before generating
npx @redocly/cli lint openapi.yaml

# Or with vacuum (faster, more opinionated)
vacuum lint openapi.yaml
```

Common issues to fix:
- Missing `operationId` on every endpoint
- Inconsistent error response schemas (standardize on RFC 7807 `Problem Details`)
- Missing `description` fields
- Overly-permissive `additionalProperties: true`

### Step 2 – Choose a Generator

| Target Language | Recommended Generator | Command |
|----------------|----------------------|---------|
| TypeScript/Node.js | `openapi-typescript` + custom fetch | `npx openapi-typescript openapi.yaml -o src/api/schema.ts` |
| TypeScript/React | `@tanstack/query` + `openapi-typescript` | See below |
| Python | `openapi-python-client` | `openapi-python-client generate --path openapi.yaml` |
| Go | `oapi-codegen` | `oapi-codegen -package api openapi.yaml > api/client.gen.go` |
| Rust | `openapi-generator` (rust-server) | `openapi-generator generate -i openapi.yaml -g rust` |

### Step 3 – TypeScript Client Pattern

```typescript
// Generated from OpenAPI spec via openapi-typescript
import type { paths } from "./schema"; // auto-generated types

// ── Type-safe fetch wrapper ────────────────────────────────────────────────
type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

interface ApiError {
  status: number;
  title: string;
  detail?: string;
  instance?: string;
}

class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => Promise<string>
  ) {}

  private async request<T>(
    method: string,
    path: string,
    options?: RequestInit & { params?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const url = new URL(path, this.baseUrl);

    if (options?.params) {
      Object.entries(options.params).forEach(([k, v]) =>
        url.searchParams.set(k, v)
      );
    }

    const response = await fetch(url.toString(), {
      ...options,
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        status: response.status,
        title: response.statusText,
      }));
      return { data: null, error };
    }

    const data: T = await response.json();
    return { data, error: null };
  }

  // ── Typed methods generated from spec ──────────────────────────────────────

  async listTransactions(
    params: paths["/transactions"]["get"]["parameters"]["query"]
  ) {
    return this.request<
      paths["/transactions"]["get"]["responses"]["200"]["content"]["application/json"]
    >("GET", "/transactions", { params: params as any });
  }

  async createTransaction(
    body: paths["/transactions"]["post"]["requestBody"]["content"]["application/json"]
  ) {
    return this.request<
      paths["/transactions"]["post"]["responses"]["201"]["content"]["application/json"]
    >("POST", "/transactions", { body: JSON.stringify(body) });
  }
}
```

### Step 4 – Python Client Pattern

```python
# Generated from OpenAPI spec via openapi-python-client
# Or hand-crafted with httpx + pydantic

from __future__ import annotations
import httpx
from pydantic import BaseModel, Field
from typing import Optional

class Transaction(BaseModel):
    id: str
    amount: float
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    created_at: str

class CreateTransactionRequest(BaseModel):
    amount: float = Field(gt=0)
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    description: Optional[str] = None

class FinanceApiClient:
    def __init__(self, base_url: str, api_key: str):
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30.0,
        )

    async def __aenter__(self): return self
    async def __aexit__(self, *args): await self._client.aclose()

    async def list_transactions(
        self, page: int = 1, page_size: int = 20
    ) -> list[Transaction]:
        resp = await self._client.get(
            "/transactions",
            params={"page": page, "page_size": page_size},
        )
        resp.raise_for_status()
        return [Transaction(**t) for t in resp.json()["items"]]

    async def create_transaction(
        self, request: CreateTransactionRequest
    ) -> Transaction:
        resp = await self._client.post(
            "/transactions",
            json=request.model_dump(),
        )
        resp.raise_for_status()
        return Transaction(**resp.json())
```

---

## Test Generation Patterns

### TypeScript Tests (Vitest + MSW)

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { ApiClient } from "./client";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("ApiClient.listTransactions", () => {
  it("returns paginated transactions", async () => {
    server.use(
      http.get("https://api.example.com/transactions", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("page")).toBe("1");
        return HttpResponse.json({
          items: [{ id: "t1", amount: 100.0, currency: "USD", created_at: "2026-01-01" }],
          total: 1,
        });
      })
    );

    const client = new ApiClient("https://api.example.com", async () => "test-token");
    const { data, error } = await client.listTransactions({ page: "1" });

    expect(error).toBeNull();
    expect(data?.items).toHaveLength(1);
    expect(data?.items[0].currency).toBe("USD");
  });

  it("handles 401 unauthorized", async () => {
    server.use(
      http.get("https://api.example.com/transactions", () =>
        HttpResponse.json(
          { status: 401, title: "Unauthorized", detail: "Token expired" },
          { status: 401 }
        )
      )
    );

    const client = new ApiClient("https://api.example.com", async () => "expired-token");
    const { data, error } = await client.listTransactions({ page: "1" });

    expect(data).toBeNull();
    expect(error?.status).toBe(401);
  });

  it("handles network failure gracefully", async () => {
    server.use(
      http.get("https://api.example.com/transactions", () =>
        HttpResponse.error()
      )
    );

    const client = new ApiClient("https://api.example.com", async () => "token");
    await expect(client.listTransactions({ page: "1" })).rejects.toThrow();
  });
});
```

### Python Tests (pytest + respx)

```python
import pytest
import respx
import httpx
from finance_client import FinanceApiClient, CreateTransactionRequest

@pytest.fixture
def client():
    return FinanceApiClient("https://api.example.com", "test-key")

@respx.mock
@pytest.mark.asyncio
async def test_list_transactions_success(client):
    respx.get("https://api.example.com/transactions").mock(
        return_value=httpx.Response(
            200,
            json={"items": [{"id": "t1", "amount": 100.0, "currency": "USD", "created_at": "2026-01-01"}]}
        )
    )
    transactions = await client.list_transactions()
    assert len(transactions) == 1
    assert transactions[0].currency == "USD"

@respx.mock
@pytest.mark.asyncio
async def test_create_transaction_validates_input(client):
    with pytest.raises(ValueError):
        # amount must be > 0
        CreateTransactionRequest(amount=-50.0, currency="USD")

@respx.mock
@pytest.mark.asyncio
async def test_list_transactions_401(client):
    respx.get("https://api.example.com/transactions").mock(
        return_value=httpx.Response(401, json={"detail": "Unauthorized"})
    )
    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await client.list_transactions()
    assert exc_info.value.response.status_code == 401
```

---

## Checklist for Generated Clients

- [ ] All request parameters are typed (no `any` / `dict`)
- [ ] All response shapes are validated (Pydantic / Zod / io-ts)
- [ ] Authentication is handled centrally (not scattered)
- [ ] Retries with exponential backoff for 429 and 5xx responses
- [ ] Timeout is set on all requests
- [ ] Pagination helper iterates all pages automatically
- [ ] Tests cover: 200, 201, 400, 401, 403, 404, 422, 429, 500
- [ ] Mock server (MSW/respx) used instead of real network in tests
- [ ] Client is versioned to match the API version in the spec

---

## Related Skills

- `react-best-practices` – consume the generated client in React components
- `python-to-rust` – port a Python client to Rust for performance
- `kubernetes-debugging` – debug issues with deployed API services
