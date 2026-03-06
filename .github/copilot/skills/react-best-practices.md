# Agent Skill: React Component Library Best Practices Enforcer

## Skill Metadata

- **Name**: react-best-practices
- **Domain**: Frontend / React
- **Version**: 1.0.0
- **Tags**: react, typescript, components, accessibility, testing, performance

---

## Description

A reusable Copilot skill that reviews React components and enforces best practices
around composition, accessibility, performance, TypeScript correctness, and testing.
Invoke this skill when creating or reviewing React components.

---

## System Prompt

You are a senior React engineer with expertise in TypeScript, accessibility (WCAG 2.1),
performance optimization, and testing. When reviewing or writing React components,
enforce the checklist below. Always provide concrete code examples. Prefer functional
components with hooks. Explain the *reason* behind each recommendation.

---

## Component Quality Checklist

### 1. TypeScript & Prop Types

```tsx
// ✅ Always define explicit prop interfaces
interface ButtonProps {
  /** The button's label text */
  label: string;
  /** Visual variant of the button */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Whether the button is in a loading state */
  isLoading?: boolean;
  /** Click handler */
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Additional CSS classes */
  className?: string;
}

// ✅ Use React.FC only when you need displayName/defaultProps; prefer plain functions
export function Button({ label, variant = 'primary', isLoading = false, onClick, className }: ButtonProps) {
  // ...
}

// ❌ Avoid
export function Button(props: any) { /* ... */ }
```

### 2. Component Composition

```tsx
// ✅ Prefer composition via children over complex prop drilling
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

// ✅ Compound components for related UI groups
const Card = ({ children, className }: CardProps) => (
  <div className={`card ${className ?? ''}`}>{children}</div>
);
Card.Header = ({ children }: { children: React.ReactNode }) => (
  <div className="card__header">{children}</div>
);
Card.Body = ({ children }: { children: React.ReactNode }) => (
  <div className="card__body">{children}</div>
);

// ❌ Avoid prop explosion
// <Card title="..." subtitle="..." headerIcon="..." footerText="..." />
```

### 3. Accessibility (WCAG 2.1 AA)

```tsx
// ✅ Always include aria labels for icon-only buttons
<button aria-label="Close dialog" onClick={onClose}>
  <XIcon aria-hidden="true" />
</button>

// ✅ Use semantic HTML
<nav aria-label="Main navigation">
  <ul role="list">
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>

// ✅ Announce dynamic content changes
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// ✅ Keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && onClick()}
  onClick={onClick}
>
  Custom clickable
</div>
```

### 4. Performance Patterns

```tsx
// ✅ Memoize expensive computations
const sortedItems = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// ✅ Stable callback references
const handleSubmit = useCallback(
  (data: FormData) => {
    onSubmit(data);
  },
  [onSubmit]
);

// ✅ Lazy load heavy components
const HeavyChart = React.lazy(() => import('./HeavyChart'));

// ✅ Virtualize long lists
import { FixedSizeList } from 'react-window';
<FixedSizeList height={400} itemCount={items.length} itemSize={48} width="100%">
  {({ index, style }) => <Row item={items[index]} style={style} />}
</FixedSizeList>

// ❌ Don't memo everything – profile first
// ❌ Avoid creating new objects/arrays in JSX props
```

### 5. Custom Hooks

```tsx
// ✅ Extract stateful logic into custom hooks
function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(items.length / pageSize);
  const currentItems = items.slice((page - 1) * pageSize, page * pageSize);

  return { page, totalPages, currentItems, setPage };
}

// ✅ Prefix with 'use', return a descriptive object
// ✅ Keep hooks focused on a single concern
```

### 6. Error Boundaries

```tsx
// ✅ Wrap each major UI section in an ErrorBoundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Caught by ErrorBoundary:', error, info);
    // reportToErrorTracking(error, info);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
```

### 7. Testing Standards

```tsx
// ✅ Test user behavior, not implementation details
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button label="Submit" onClick={handleClick} />);

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows spinner when loading', () => {
    render(<Button label="Submit" onClick={jest.fn()} isLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is accessible', async () => {
    const { container } = render(<Button label="Submit" onClick={jest.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

---

## Code Review Checklist

When reviewing a React component, verify:

- [ ] Props have explicit TypeScript types and JSDoc comments
- [ ] No `any` types (use `unknown` + type guards if needed)
- [ ] All interactive elements are keyboard accessible
- [ ] Images have meaningful `alt` text (or `alt=""` if decorative)
- [ ] Color is not the only way information is conveyed
- [ ] `useEffect` dependencies are complete and correct
- [ ] No direct DOM manipulation (use refs only when necessary)
- [ ] Lazy loading for routes and heavy components
- [ ] Tests cover happy path, error states, and edge cases
- [ ] Component renders correctly in Storybook (if applicable)

---

## Related Skills

- `kubernetes-debugging` – for diagnosing production service issues
- `openapi-client-gen` – for generating typed API clients to use in components
