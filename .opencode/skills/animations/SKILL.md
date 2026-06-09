---
name: animations
description: Reference checklist and copy-paste patterns for adding CSS animations and micro-interactions to cringy-nostalgia. Use when implementing hover effects, entrance/exit transitions, loading states, skeleton screens, the 3D page-flip, or any motion design task in the frontend.
---

# Animations — Reference & Workflow

All animation code lives in **`frontend/src/index.css`**. Component-level utilities are applied via Tailwind classes.

---

## Existing animation systems (inventory)

### 3D page-flip — `BookDetailPage.tsx`

| Class | Role |
|---|---|
| `.book-scene` | Sets up 3D `perspective` context |
| `.book-spread` | Open book container |
| `.page-flip` | Single page — `transform-style: preserve-3d` |
| `.flip-forward` | Trigger class — runs flip-forward keyframe |
| `.flip-backward` | Trigger class — runs flip-backward keyframe |
| `.page-front` | Front face of each page |
| `.page-back` | Back face of each page |

Keyboard `←`/`→` drive page state. An `isAnimating` ref prevents double-triggers.

### Tailwind utilities already in use
- `transition-*`, `hover:scale-*`, `hover:shadow-*` on cards
- `animate-spin` for loading spinners
- `animate-pulse` for skeleton placeholders

---

## Timing reference

| Interaction type | Duration | Easing |
|---|---|---|
| Micro-interactions (hover, focus) | 100–150ms | `ease-out` |
| State changes (toggle, select) | 150–200ms | `ease-in-out` |
| Entrance animations | 200–300ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Page/modal transitions | 250–350ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Complex sequences (page-flip) | 600ms | custom |

---

## GPU-safe properties — animate ONLY these

| Property | Use for |
|---|---|
| `transform` | translate, scale, rotate |
| `opacity` | fades |
| `filter` | blur, brightness (use sparingly) |
| `clip-path` | reveal effects |

**Never animate:** `width`, `height`, `margin`, `padding`, `top`, `left`, `border-width`, `font-size`.

---

## Step-by-step: adding a new animation

1. **Define the keyframe** in `frontend/src/index.css`:
   ```css
   @keyframes my-animation {
     from { opacity: 0; transform: translateY(8px); }
     to   { opacity: 1; transform: translateY(0); }
   }
   ```
2. **Register the token** inside the `@theme {}` block:
   ```css
   @theme {
     --animate-my-animation: my-animation 250ms cubic-bezier(0.16, 1, 0.3, 1);
   }
   ```
3. **Use it in components** via the Tailwind class `animate-my-animation`.
4. **Wrap with `motion-safe:`** for automatic reduced-motion support:
   ```tsx
   <div className="motion-safe:animate-my-animation">...</div>
   ```
5. **Run through the checklist below** before shipping.

---

## Copy-paste patterns

### Hover card lift (BookCard, ReadingCard)
```tsx
<div className="transition-transform duration-150 ease-out hover:-translate-y-1 hover:shadow-lg">
```

### Button press feedback
```tsx
<button className="transition-transform duration-100 active:scale-95">
```

### Skeleton loading placeholder
```tsx
<div className="animate-pulse rounded bg-[var(--color-parchment)] h-4 w-32" />
```

### Modal / dialog entrance
```tsx
<div className="motion-safe:animate-slide-up">
  {/* modal content */}
</div>
```

### Staggered feed list
```tsx
{items.map((item, i) => (
  <div
    key={item.id}
    className="motion-safe:animate-fade-in"
    style={{ animationDelay: `${i * 40}ms` }}
  >
    <ReadingCard reading={item} />
  </div>
))}
```

### Reduced-motion detection in React
```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

---

## Pre-ship checklist

- [ ] Animation uses only GPU-safe properties (`transform`, `opacity`, `filter`, `clip-path`)
- [ ] Duration is within the timing table above for its interaction type
- [ ] `prefers-reduced-motion` is handled — either via `motion-safe:` prefix or explicit `@media` block
- [ ] Page-flip reduced-motion path: skips 3D rotation, shows instant page change
- [ ] No infinite loop without purpose (e.g., no spinning logos, no pulsing text)
- [ ] Does not block interaction during the transition (`pointer-events` not removed)
- [ ] No large element entering from off-screen on mobile
- [ ] Only one animation fires at a time on any given element
- [ ] Easing matches the animation's semantic (no `bounce` on error states)

---

## What to avoid

- Infinite animations that serve no purpose
- Blocking interaction during transitions (`pointer-events: none`)
- Large elements entering from off-screen (jarring on mobile)
- Multiple animations on the same element simultaneously
- Semantically mismatched easing (e.g., `bounce` on error messages)
