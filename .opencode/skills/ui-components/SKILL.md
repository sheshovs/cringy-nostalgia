---
name: ui-components
description: Component development reference, scaffolding templates, and canonical patterns for cringy-nostalgia. Use when building new React components or pages, refactoring existing ones, wiring up data fetching, or implementing forms.
---

# UI Components — Scaffolding & Patterns

Stack: React 19 + TypeScript strict, Tailwind CSS 4, React Router 7, TanStack Query v5, React Hook Form + Zod, Axios.

Tokens live in `frontend/src/index.css` inside `@theme {}`. No `tailwind.config.*`.

---

## Project structure

```
frontend/src/
├── index.css           # Tailwind v4 entry + @theme tokens + global styles + animations
├── App.tsx             # Router + QueryClientProvider + AuthProvider
├── api/
│   ├── client.ts       # Axios instance with JWT refresh interceptor
│   └── index.ts        # authApi, usersApi, booksApi, readingsApi, searchApi
├── store/
│   └── AuthContext.tsx # useAuth() → { user, login, register, logout, setUser }
├── types/
│   └── index.ts        # User, Book, Reading, ReadingStatus, OpenLibraryBook
├── components/         # Reusable components (~150 lines max each)
└── pages/              # Route-level pages
```

---

## Design token quick reference

| Token | Value | Usage |
|---|---|---|
| `--color-cream` | `#0d1a15` | Page background |
| `--color-surface` | `#162119` | Cards, inputs, modals |
| `--color-parchment` | `#2e4438` | Elevated sections |
| `--color-accent` | `#3a6a5a` | Accents |
| `--color-accent-light` | `#4a8a72` | Hover states |
| `--color-mauve-dark` | `#7EAA7B` | Primary CTAs, titles, links |
| `--color-mauve` | `#9ec49b` | Borders, focus rings |
| `--color-ink` | `#e0ede8` | Primary text |
| `--color-ink-light` | `#7fa898` | Secondary/muted text |
| `--color-border` | `#2a3d32` | Borders |
| `--font-display` | Playfair Display, serif | Headings |
| `--font-body` | Inter, sans-serif | Body text |

---

## New component scaffold

```tsx
// frontend/src/components/MyComponent.tsx

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <article className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
      <h2 className="text-[var(--color-ink)] font-[var(--font-display)]">
        {title}
      </h2>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-3 text-[var(--color-mauve-dark)] hover:text-[var(--color-mauve)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mauve)]"
        >
          Action
        </button>
      )}
    </article>
  );
}
```

Rules:
- Named export always (`export function`, not `export default`)
- TypeScript interface above the component
- CSS variables via arbitrary value syntax: `text-[var(--color-ink)]`
- `style={{}}` only for dynamic/computed values (hex colors, CSS transforms)
- No CSS modules, no Styled Components

---

## New page scaffold

```tsx
// frontend/src/pages/MyPage.tsx
import { useQuery } from '@tanstack/react-query';
import { myApi } from '../api';

export function MyPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-entity'],
    queryFn: myApi.getAll,
  });

  if (isLoading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-[var(--color-parchment)]" />
          <div className="h-4 w-full rounded bg-[var(--color-parchment)]" />
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-red-400">Failed to load. Please try again.</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl text-[var(--color-ink)]">Page Title</h1>
      {/* content */}
    </main>
  );
}
```

---

## Form scaffold (React Hook Form + Zod)

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export function MyForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await myApi.submit(data);
    } catch {
      setError('root', { message: 'Something went wrong. Try again.' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm text-[var(--color-ink-light)] mb-1">
          Email
        </label>
        <input
          id="email"
          {...register('email')}
          className="w-full rounded bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-mauve)]"
        />
        {errors.email && (
          <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
        )}
      </div>

      {errors.root && (
        <p className="text-red-400 text-sm">{errors.root.message}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 rounded bg-[var(--color-mauve-dark)] text-[var(--color-cream)] font-medium transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
```

---

## Mutation pattern (write operations)

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useDeleteBook(bookId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => booksApi.delete(bookId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] });
      qc.invalidateQueries({ queryKey: ['books', bookId] });
    },
  });
}
```

---

## Auth pattern

```tsx
import { useAuth } from '../store/AuthContext';

export function ProfileHeader() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header>
      <span className="text-[var(--color-ink)]">{user.username}</span>
      <button onClick={logout}>Log out</button>
    </header>
  );
}
```

`useAuth()` returns: `{ user, login, register, logout, setUser }`

---

## Coding conventions checklist

- [ ] Named export: `export function MyComponent()`
- [ ] TypeScript interface for all props, defined above the component
- [ ] All colors via `text-[var(--color-...)]` / `bg-[var(--color-...)]` — no raw Tailwind colors
- [ ] `style={{}}` only for truly dynamic values (computed transforms, hex strings)
- [ ] No CSS modules or Styled Components
- [ ] Forms: React Hook Form + Zod always; errors as `text-red-400 text-xs mt-1`
- [ ] Data reads: `useQuery`; data writes: `useMutation` + `invalidateQueries`
- [ ] Auth: `useAuth()` for current user
- [ ] File under ~150 lines; extract sub-components if exceeded
- [ ] Semantic HTML: `<button>`, `<nav>`, `<main>`, `<article>`, `<section>`
- [ ] Always render loading and error states in Query components
- [ ] Responsive design mobile-first: `sm:`, `md:`, `lg:` prefixes
- [ ] Spacing: `gap-*` over `margin-*` in flex/grid
- [ ] Tailwind JIT: full class names only — no dynamic string concatenation of partial classes
