---
name: accessibility
description: WCAG 2.1 AA audit reference and fix templates for cringy-nostalgia. Use when reviewing components for accessibility compliance, adding ARIA attributes, fixing keyboard navigation, checking color contrast, or improving screen reader support.
---

# Accessibility — Audit Reference & Fix Templates

Target: **WCAG 2.1 Level AA** across all pages and components.

---

## Audit scope inventory

### Components
| File | Key concerns |
|---|---|
| `Navbar.tsx` | Navigation landmark, active link state announcement |
| `BookCard.tsx` | Interactive card, 3D SVG cover (decorative), hover action overlay |
| `ReadingCard.tsx` | Status badges, star rating semantics |
| `ReadingForm.tsx` | Complex form — Open Library live search, multi-field cringe analysis |
| `PrivateRoute.tsx` | Auth redirect announcement |

### Pages
| File | Key concerns |
|---|---|
| `FeedPage.tsx` | List pagination, live region for results |
| `LoginPage.tsx` | Auth form, error handling |
| `RegisterPage.tsx` | Auth form, error handling |
| `ProfilePage.tsx` | Follow/unfollow button state, books grid |
| `MyBooksPage.tsx` | Book management, cover customizer modal (focus trap) |
| `BookDetailPage.tsx` | 3D page-flip — `←`/`→` keys, highest-risk animation |
| `SettingsPage.tsx` | Bio + avatar form fields |

---

## Audit report template

Copy this template for each component/page:

```
## [ComponentName]

### Failures
- [WCAG criterion e.g. 1.1.1 Non-text Content]: [description] — [fix]

### Warnings
- [description] — [recommended improvement]

### Passes
- [what is already correct]
```

Always include a concrete code fix, not just a description.

---

## WCAG AA rules — quick reference

### 1. Semantic HTML
- `<button>` for actions, `<a>` for navigation, never `<div>` for interactive elements
- Landmarks: `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, `<article>`
- Heading hierarchy must be sequential (`h1` → `h2` → `h3`) — no skips

### 2. ARIA (use only when native HTML is insufficient)
```tsx
// Dialog must have accessible name
<div role="dialog" aria-labelledby="dialog-title">

// Live regions for async updates
<div aria-live="polite">Search results</div>

// Icon-only button
<button aria-label="Close">✕</button>

// Loading state
<div aria-busy="true">Loading...</div>

// Form error link
<input aria-describedby="email-error" />
<p id="email-error">Invalid email format</p>
```

### 3. Keyboard navigation
- Every interactive element must be reachable via `Tab` and operable via `Enter`/`Space`
- Focus order matches visual reading order
- **Modal focus trap:** focus enters on open, `Tab` cycles inside, `Escape` closes and returns focus to trigger
- `BookDetailPage` `←`/`→` arrows: ensure no conflict with natural scroll, announce current page

### 4. Images and media
```tsx
// Informative image
<img src="cover.jpg" alt="The Great Gatsby cover" />

// Decorative image
<img src="decoration.png" alt="" />

// Decorative SVG (BookCard procedural cover)
<svg aria-hidden="true">...</svg>

// SVG used as button
<svg aria-label="Delete book" role="img"><title>Delete book</title>...</svg>
```

### 5. Forms
```tsx
// Correct label association
<label htmlFor="email">Email</label>
<input id="email" aria-required="true" aria-describedby="email-error" />
{error && <p id="email-error" role="alert">{error}</p>}
```

After submission failure: move focus to the first errored field or an error summary.

### 6. Color contrast — project-specific pairs

| Pair | Hex values | Requirement | Status |
|---|---|---|---|
| `--color-ink` on `--color-cream` | `#e0ede8` on `#0d1a15` | 4.5:1 (normal) | Verify |
| `--color-ink-light` on `--color-cream` | `#7fa898` on `#0d1a15` | 4.5:1 (normal) | Likely failure |
| `--color-mauve-dark` on `--color-surface` | `#7EAA7B` on `#162119` | 4.5:1 (normal) | Verify |
| `text-red-400` on `--color-surface` | ~`#f87171` on `#162119` | 4.5:1 (normal) | Verify |

When a pairing fails: propose a token adjustment in `frontend/src/index.css` that preserves visual intent.

### 7. Focus styles
```tsx
// Use focus-visible (keyboard only, not mouse)
<button className="focus-visible:ring-2 focus-visible:ring-[var(--color-mauve)] focus-visible:outline-none">
```

Never `outline: none` without a custom replacement. Focus rings use `--color-mauve` or `--color-mauve-dark`.

### 8. Reduced motion
The 3D page-flip in `BookDetailPage` is the highest-risk animation. Verify it has a reduced-motion fallback.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Common fix templates

### Missing label on input
```tsx
// Before
<input type="text" placeholder="Search books..." />

// After
<label htmlFor="book-search" className="sr-only">Search books</label>
<input id="book-search" type="text" placeholder="Search books..." />
```

### Icon button without accessible name
```tsx
// Before
<button onClick={onDelete}><TrashIcon /></button>

// After
<button onClick={onDelete} aria-label="Delete book">
  <TrashIcon aria-hidden="true" />
</button>
```

### Modal without focus trap
```tsx
// Pattern: trap focus inside modal
useEffect(() => {
  if (!isOpen) return;
  const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  firstFocusable?.focus();
}, [isOpen]);
```

### Dynamic content without live region
```tsx
// Search results that update asynchronously
<div aria-live="polite" aria-atomic="false">
  {results.map(r => <SearchResult key={r.id} {...r} />)}
</div>
```
