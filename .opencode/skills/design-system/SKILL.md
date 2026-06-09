---
name: design-system
description: Design token reference and style guide for cringy-nostalgia. Use when adding new design tokens, auditing components for hardcoded colors or raw Tailwind classes, extending the visual language, or standardizing any design decision across the frontend.
---

# Design System — Token Reference & Workflow

All tokens and global styles live in one file: **`frontend/src/index.css`**.

No `tailwind.config.*` exists — extend/override via `@theme {}` only.

---

## Color tokens (complete inventory)

| Token | Value | Role |
|---|---|---|
| `--color-cream` | `#0d1a15` | Page background (`body`) |
| `--color-surface` | `#162119` | Cards, inputs, modals, sheets |
| `--color-parchment` | `#2e4438` | Elevated surfaces, book page bg |
| `--color-accent` | `#3a6a5a` | Accents, icon fills |
| `--color-accent-light` | `#4a8a72` | Hover states for accent elements |
| `--color-mauve-dark` | `#7EAA7B` | Primary CTA, active titles, links |
| `--color-mauve` | `#9ec49b` | Borders, focus rings, subtle highlights |
| `--color-rose-dust` | `#9ec49b` | Alias → `--color-mauve` |
| `--color-teal-muted` | `#3a6a5a` | Alias → `--color-accent` |
| `--color-teal-dark` | `#4a8a72` | Alias → `--color-accent-light` |
| `--color-ink` | `#e0ede8` | Primary text |
| `--color-ink-light` | `#7fa898` | Secondary/muted text, placeholders |
| `--color-border` | `#2a3d32` | All borders |

> `rose-dust`, `teal-muted`, and `teal-dark` are semantic aliases with duplicate values — consolidating them in future refactors is encouraged.

---

## Typography tokens

| Token | Value | Usage |
|---|---|---|
| `--font-display` | `"Playfair Display", Georgia, serif` | Headings, book titles, feature text |
| `--font-body` | `"Inter", system-ui, sans-serif` | Body copy, labels, UI text |

Both are applied globally via `h1–h6` and `body` rules in `index.css` — only override when intentional.

---

## Correct token usage

```tsx
// Correct — uses design token via Tailwind arbitrary value syntax
<p className="text-[var(--color-ink-light)]">Secondary text</p>
<div className="bg-[var(--color-surface)] border border-[var(--color-border)]">Card</div>
<button className="text-[var(--color-mauve-dark)]">Primary CTA</button>

// Incorrect — bypasses the design system
<p className="text-gray-400">Secondary text</p>
<div className="bg-zinc-900 border border-zinc-700">Card</div>
<button style={{ color: '#7EAA7B' }}>Primary CTA</button>
```

---

## Step-by-step: adding a new token

1. Open `frontend/src/index.css`
2. Inside the `@theme {}` block, add the token with a comment describing its role:
   ```css
   @theme {
     /* existing tokens... */

     /* Warning/destructive state background */
     --color-danger-surface: #3d1a1a;
   }
   ```
3. Use the token consistently across all components that need it
4. Never allow a one-off hardcoded value — if a value doesn't map to an existing token, add a new one

Token naming conventions:
- Colors: `--color-<semantic-name>` (not `--color-#hex`, not `--color-role-role`)
- Fonts: `--font-<role>`
- Animations: `--animate-<name>`
- Describe **what it is semantically**, not its literal value

---

## Spacing and sizing conventions

- Use Tailwind's default spacing scale: `p-4`, `gap-6`, `mt-8`
- Do not introduce arbitrary pixel values unless unavoidable
- Layout container convention: `max-w-2xl mx-auto px-4`
- Prefer `gap-*` over `margin-*` in flex/grid layouts

---

## Audit workflow: finding hardcoded values in a component

1. Search the file for hex patterns: `#[0-9a-fA-F]{3,6}`
2. Search for raw Tailwind color classes: `bg-gray-`, `bg-zinc-`, `text-gray-`, `text-emerald-`, etc.
3. Search for `style=` props with color values
4. For each hit, map it to the closest existing token from the table above
5. Replace with `text-[var(--color-...)]` or `bg-[var(--color-...)]` syntax
6. If no existing token maps correctly, propose a new token (step above)

---

## Known dead code

**`frontend/src/App.css`** — leftover Vite scaffold file. Contains old custom properties (`--accent`, `--border`, etc.) and is **not imported anywhere** in the project. Safe to delete.

---

## Custom utilities and animations

To add a custom utility class:
```css
/* In index.css */
@utility truncate-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
```

To add a custom animation (see also: `animations` skill):
```css
@keyframes my-anim { from { opacity: 0; } to { opacity: 1; } }

@theme {
  --animate-my-anim: my-anim 200ms ease-out;
}
```

---

## WCAG contrast minimums

| Text size | Minimum ratio |
|---|---|
| Normal text (< 18pt / < 14pt bold) | 4.5:1 |
| Large text (≥ 18pt / ≥ 14pt bold) | 3:1 |
| UI components and graphics | 3:1 |

The `--color-ink` / `--color-cream` pairing must always be preserved for body text. Alert before any token change that would drop below these ratios.
