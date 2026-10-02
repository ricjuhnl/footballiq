## Layout

The root layout, `app/layout.tsx`, is the single place for app-wide providers and global infrastructure.

**Do not remove any existing entries without a reason.** Current infrastructure in the layout:

| Entry | Purpose |
|-------|---------|
| `ThemeProvider` | Light/dark mode via `next-themes` |
| `Toaster` | Global toast notifications via Sonner |
| `ChunkLoadErrorHandler` | Required — prevents known ChunkLoadError race condition bug |

---

## Typography

| Role | Font | Tailwind Class | Default Usage |
|------|------|---------------|-------|
| Body | DM Sans | `font-sans` | All body text, labels, descriptions |
| Display | Plus Jakarta Sans | `font-display` | Page titles, hero headings, section headers |
| Mono | JetBrains Mono | `font-mono` | Code snippets, numeric data, IDs, timestamps |

**Size hierarchy:** Use Tailwind's scale. Headings: `text-4xl`→`text-3xl`→`text-2xl`→`text-xl`. Body: `text-base`→`text-sm`. Captions: `text-xs`.

Always use `tracking-tight` on large headings (`text-2xl` and above).

---

## Color System (Design Tokens)

All colors use CSS variables — **never hardcode color values**.

| Token | Purpose |
|-------|---------|
| `background` / `foreground` | Page-level bg and text |
| `card` / `card-foreground` | Card surfaces |
| `primary` / `primary-foreground` | Brand buttons, links, accents |
| `secondary` / `secondary-foreground` | Secondary buttons, subtle highlights |
| `muted` / `muted-foreground` | Disabled states, helper text, subtle backgrounds |
| `accent` / `accent-foreground` | Hover states, active nav items |
| `destructive` / `destructive-foreground` | Errors, delete actions |
| `border` | Borders and dividers |
| `input` | Form input borders |
| `ring` | Focus rings |

Usage: `bg-primary`, `text-muted-foreground`, `border-border`, etc.

---

## Spacing Scale

Based on an 8px grid. Use these CSS variables or Tailwind equivalents:

| Token | Value | Tailwind |
|-------|-------|----------|
| `--spacing-xs` | 4px | `p-1`, `gap-1` |
| `--spacing-sm` | 8px | `p-2`, `gap-2` |
| `--spacing-md` | 16px | `p-4`, `gap-4` |
| `--spacing-lg` | 24px | `p-6`, `gap-6` |
| `--spacing-xl` | 32px | `p-8`, `gap-8` |
| `--spacing-2xl` | 48px | `p-12`, `gap-12` |
| `--spacing-3xl` | 64px | `p-16`, `gap-16` |

**Vary spacing rhythm** — don't use the same gap everywhere. Hero → large gap → content → medium gap → footer.

---

## Shadow Scale

| Token | Default Usage |
|-------|-------|
| `--shadow-sm` | Subtle card lift, input focus |
| `--shadow-md` | Cards, dropdowns, popovers |
| `--shadow-lg` | Modals, elevated panels |

These are CSS variables only — use them directly in inline styles or custom CSS as `var(--shadow-sm)` etc. They are not mapped to Tailwind's `shadow-*` utilities.

---

## Border Radius

| Token | Value | Default Usage |
|-------|-------|-------|
| `--radius` | 0.625rem | Default (buttons, inputs, cards) |
| `--radius-sm` | calc(var(--radius) - 4px) | Small elements (badges, chips) |
| `--radius-lg` | calc(var(--radius) + 4px) | Large containers, hero cards |
| `--radius-full` | 9999px | Avatars, pills, circular buttons |

---

## Animation Timing

| Token | Value | Tailwind Class | Default Usage |
|-------|-------|---------------|-------|
| `--duration-fast` | 150ms | `duration-fast` | Hover states, toggles |
| `--duration-normal` | 250ms | `duration-normal` | Page transitions, reveals |
| `--duration-slow` | 350ms | `duration-slow` | Complex animations, modals |

---

## UI Components

Only `Toaster` (`@/components/ui/sonner`) is currently used. The former shadcn UI kit
(buttons, forms, overlays, `components/layouts/*`, `theme-toggle`) was removed as unused.
Re-add individual components with `npx shadcn add <name>` (config in `components.json`),
then document their props here. Toasts: `import { toast } from 'sonner'`.
## SSR / Hydration Safety — `@/components/client-only`, `@/components/safe-format`
Server-rendered HTML must match the client's first render. An automated SSR lint
(`eslint.ssr.config.mjs` — do not delete) runs after every build and fails it on unsafe
patterns. Use these primitives instead of hand-rolling fixes:
| Primitive | Import | Use for |
|-----------|--------|---------|
| `ClientOnly` | `@/components/client-only` | Anything browser-only or non-deterministic: `window`/`localStorage` reads, live clocks, random values, third-party widgets. Pass a `fallback` sized like the content. |
| `useMounted()` | `@/components/client-only` | Hook variant when you need the boolean directly. |
| `SafeDate` / `SafeTime` | `@/components/safe-format` | Dates/times — formats with explicit locale + UTC so SSR matches client. `localize` re-renders in the visitor's timezone after mount. Props: `date` (Date\|string\|number), `options?` (Intl.DateTimeFormatOptions), `locale?`, `localize?`, `className?` — there is no `format`/`value` prop; e.g. `<SafeDate date={post.createdAt} options={{ dateStyle: 'medium' }} />`. |
| `SafeNumber` | `@/components/safe-format` | Numbers/currency, same guarantees. Props: `value` (number), `options?` (Intl.NumberFormatOptions), `currency?` (`currency="USD"`), `locale?`, `localize?`, `className?`. |
Rules of thumb: never touch `window`/`document` at module scope; never seed `useState` with
`Date.now()`/`Math.random()`/`new Date()`; never call `toLocaleString`-style methods without
an explicit locale (and `timeZone` for dates).
