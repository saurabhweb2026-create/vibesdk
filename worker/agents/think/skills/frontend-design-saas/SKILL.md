---
name: frontend-design-saas
description: S-tier SaaS dashboard and product UI reference. Use this skill when building application shells, data tables, settings panels, billing pages, dashboards, auth flows, admin tools, or any internal/customer-facing SaaS product UI. Inspired by Stripe, Linear, Vercel, Airbnb, Notion. Covers neutral-led design tokens, sidebar+content shells, dense data UIs, form-heavy configuration pages, command palettes, empty states, and the accessibility (WCAG AA+) bar these products clear.
---
# SaaS Design System (Stripe / Linear / Vercel lineage)

> **AI-Optimized Design Reference** for building S-tier SaaS dashboards, admin consoles, billing pages, settings UIs, data-dense application shells, and product surfaces.
>
> Tonal anchors: `stripe.com/dashboard`, `linear.app`, `vercel.com/dashboard`, `notion.so/teamspace`, `clerk.com`, `planetscale.com/console`.

---

## Quick Reference (TL;DR)

```
Brand Accent:    #5E6AD2 (indigo) - replace with product brand
Neutrals:        #FFFFFF → #F8FAFC → #F1F5F9 → #E2E8F0 → #94A3B8 → #475569 → #0F172A
Text:            #0F172A (primary) / #475569 (muted) / #94A3B8 (subtle)
Border:          #E2E8F0 (default) / #CBD5E1 (strong)
Font Sans:       "Inter", "Geist", system-ui (NOT Arial, NOT Roboto)
Font Mono:       "JetBrains Mono", "Geist Mono", ui-monospace
Base Spacing:    4px (scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
Border Radius:   Buttons/inputs = 6-8px (NOT pill), Cards = 8-12px, Modals = 12-16px
Shadow:          Tight, low-spread, single-direction (NOT diffuse marketing shadows)
Density:         Compact-to-comfortable; row heights 36-44px, button heights 32-36px
```

The fastest way to get this wrong: use marketing-page aesthetics (huge type, generous whitespace, pill buttons, gradient hero shadows) in a product surface. SaaS UIs are **dense, neutral, fast, and quiet**. The brand color appears in <5% of the pixels and earns its weight by marking only what's interactive or active.

---

## 2. Color System

### 2.1 Neutral Scale (the backbone)

SaaS UIs are 80–90% neutrals. The neutral scale carries the entire interface; brand is sprinkled on top. Use a slightly cool neutral (slate) by default — it reads more "product" than warm grays which feel marketing/lifestyle.

| Token | Hex | Usage |
|---|---|---|
| `--neutral-0` | `#FFFFFF` | Page background (light mode), surface lifted onto canvas |
| `--neutral-50` | `#F8FAFC` | Canvas background, alternating row stripe |
| `--neutral-100` | `#F1F5F9` | Hover background, subtle fill, table header |
| `--neutral-200` | `#E2E8F0` | **Default border**, divider |
| `--neutral-300` | `#CBD5E1` | Strong border, input border on focus-within parent |
| `--neutral-400` | `#94A3B8` | **Subtle text** (placeholders, disabled, captions) |
| `--neutral-500` | `#64748B` | Tertiary text, icon default |
| `--neutral-600` | `#475569` | **Muted text** (descriptions, secondary labels) |
| `--neutral-700` | `#334155` | Strong icon, hover text |
| `--neutral-800` | `#1E293B` | Heading in dense UIs, code text |
| `--neutral-900` | `#0F172A` | **Primary text**, primary icons |
| `--neutral-950` | `#020617` | Highest contrast (rare; only for critical labels) |

### 2.2 Brand Accent (single color, used sparingly)

Pick **one** accent. Use a 6-step ramp so hover/active/focused/disabled all derive from the same hue. Defaults below use indigo (`#5E6AD2`, Linear's accent) — swap the hue for your brand but keep the structure.

| Token | Hex | Usage |
|---|---|---|
| `--brand-50` | `#EEF0FB` | Selected row background, badge background, focus ring background |
| `--brand-100` | `#DDE0F7` | Hover on brand surfaces |
| `--brand-200` | `#B9C0EF` | Disabled brand button, decorative |
| `--brand-500` | `#7B85DC` | Brand hover surface stroke |
| `--brand-600` | `#5E6AD2` | **Primary brand** — default button bg, link text, focus ring, active nav item |
| `--brand-700` | `#4A56C0` | Hover state for primary button |
| `--brand-800` | `#3A45A8` | Active/pressed state |
| `--brand-900` | `#2A3284` | High-contrast brand text on light background |

### 2.3 Semantic / Status Colors

Used for state — never for decoration. Each has a `text`, `bg`, `border` triplet so badges and inline messages stay legible.

| State | `text` | `bg` (filled) | `bg-subtle` (badge) | `border` |
|---|---|---|---|---|
| **Success** | `#15803D` | `#16A34A` | `#DCFCE7` | `#86EFAC` |
| **Warning** | `#A16207` | `#CA8A04` | `#FEF9C3` | `#FDE68A` |
| **Error / Destructive** | `#B91C1C` | `#DC2626` | `#FEE2E2` | `#FCA5A5` |
| **Info** | `#1D4ED8` | `#2563EB` | `#DBEAFE` | `#93C5FD` |
| **Neutral (default badge)** | `#334155` | `#64748B` | `#F1F5F9` | `#CBD5E1` |

Rules:
- Inline form errors: `text` color on `bg-subtle` background, `border` for the input.
- Toasts: `bg-subtle` panel, `text` heading, `--neutral-700` body.
- Status badges: `text` on `bg-subtle` + 1px `border`. Never use solid `bg` for badges (too loud).

### 2.4 Data Visualization Palette

When you need >1 color for charts. Categorical — visually distinct, similar luminance. Avoid the brand color in this palette so brand reads as "interactive" elsewhere.

```
--chart-1: #2563EB  (blue)
--chart-2: #16A34A  (green)
--chart-3: #CA8A04  (amber)
--chart-4: #DC2626  (red)
--chart-5: #9333EA  (violet)
--chart-6: #0891B2  (cyan)
--chart-7: #DB2777  (pink)
--chart-8: #65A30D  (lime)
```

### 2.5 Dark Mode Mapping

SaaS dark modes are **not just inverted**. They are slightly desaturated, slightly lifted, with carefully tuned elevation. Use `#0A0E1A` (or `#0B0F1C`) as the canvas — NEVER `#000000`. Pure black creates harsh contrast and exposes any banding in shadows.

| Token | Light | Dark |
|---|---|---|
| `--bg-canvas` | `#F8FAFC` | `#0A0E1A` |
| `--bg-surface` | `#FFFFFF` | `#111827` |
| `--bg-elevated` | `#FFFFFF` | `#1F2937` |
| `--bg-overlay` (popover/modal) | `#FFFFFF` | `#1F2937` |
| `--text-primary` | `#0F172A` | `#F1F5F9` |
| `--text-muted` | `#475569` | `#94A3B8` |
| `--text-subtle` | `#94A3B8` | `#64748B` |
| `--border-default` | `#E2E8F0` | `#1F2937` |
| `--border-strong` | `#CBD5E1` | `#374151` |
| `--brand-bg-subtle` | `#EEF0FB` | `rgba(94, 106, 210, 0.16)` |
| `--brand-fg` | `#5E6AD2` | `#A5B4FC` |

In dark mode the **brand color shifts lighter** (toward `--brand-500/400` instead of `--brand-600/700`) to maintain contrast against the dark canvas.

---

## 3. Typography

### 3.1 Font Stack

```css
--font-sans: "Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI",
             "SF Pro Text", system-ui, sans-serif;
--font-mono: "JetBrains Mono", "Geist Mono", "SF Mono", "Menlo", "Consolas",
             ui-monospace, monospace;
```

Hard rules:
- **Never use `Arial`, `Helvetica`, `Roboto`, or `Times`** in a SaaS UI. These read as default/unstyled. If you can't load a webfont, fall through to `system-ui` instead.
- **Never mix two display fonts.** One sans + one mono is the entire stack.
- **`font-feature-settings: "cv11", "ss01", "ss03"`** for Inter (or whatever stylistic sets your font has) — small caps and alternate forms make tables look intentional.
- **`font-variant-numeric: tabular-nums`** on EVERY column that contains numbers (money, dates, IDs, counts). Non-tabular figures make rows shimmer.

### 3.2 Type Scale (SaaS-tuned — denser than marketing)

| Token | Size | Line Height | Weight | Letter Spacing | Use |
|---|---|---|---|---|---|
| `text-2xs` | 11px / 0.6875rem | 1.36 (15px) | 500 | 0.04em | Microlabels (uppercase metadata, table column tags) |
| `text-xs` | 12px / 0.75rem | 1.33 (16px) | 400/500 | 0 | Captions, badge text, table secondary |
| `text-sm` | 13px / 0.8125rem | 1.38 (18px) | 400/500 | 0 | **Default UI text**: table rows, buttons, form labels |
| `text-base` | 14px / 0.875rem | 1.43 (20px) | 400/500 | 0 | Body text, paragraph copy in panels |
| `text-md` | 15px / 0.9375rem | 1.47 (22px) | 400/500 | 0 | Comfortable reading (descriptions, modals) |
| `text-lg` | 16px / 1rem | 1.5 (24px) | 500/600 | -0.005em | Card headings, sidebar section labels |
| `text-xl` | 18px / 1.125rem | 1.44 (26px) | 600 | -0.01em | Subsection headings |
| `text-2xl` | 20px / 1.25rem | 1.4 (28px) | 600 | -0.015em | Page subheadings |
| `text-3xl` | 24px / 1.5rem | 1.33 (32px) | 600 | -0.02em | Page title (h1 in dashboards) |
| `text-4xl` | 30px / 1.875rem | 1.2 (36px) | 600/700 | -0.025em | Marketing-adjacent hero in settings |

**Critical**: the default UI size in SaaS is **13px or 14px**, NOT 16px. Stripe is 14px. Linear is 13px. Vercel is 14px. 16px feels too big and creates pages that scroll forever.

### 3.3 Weights

| Weight | Value | Use |
|---|---|---|
| Regular | 400 | Body, table cells, descriptions |
| Medium | 500 | Default for buttons, labels, table headers, navigation, badge text |
| Semibold | 600 | Headings, emphasized stats, active nav |
| Bold | 700 | Rare — only marketing-adjacent surfaces or KPI numbers |

**Never** use weight 800 or 900 in a SaaS UI.

### 3.4 Letter Spacing

| Context | Value |
|---|---|
| Body / table | 0 |
| Headings ≥18px | -0.01em to -0.025em (tighter as size grows) |
| Microlabels / uppercase | 0.04em to 0.06em |
| Mono | 0 |

### 3.5 Text Rendering

```css
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
}

.numeric, table, [data-numeric] {
  font-variant-numeric: tabular-nums;
}
```

---

## 4. Spacing System

### 4.1 Base Unit

```css
--space-unit: 4px;
```

### 4.2 Scale

| Token | px | rem | Common Use |
|---|---|---|---|
| `space-0` | 0 | 0 | Reset |
| `space-px` | 1 | — | Hairlines, dividers |
| `space-0.5` | 2 | 0.125 | Tight icon-to-text gaps |
| `space-1` | 4 | 0.25 | Inline tight |
| `space-1.5` | 6 | 0.375 | — |
| `space-2` | 8 | 0.5 | Default tight gap, icon-text, badge padding |
| `space-2.5` | 10 | 0.625 | Input vertical padding (compact) |
| `space-3` | 12 | 0.75 | Input vertical padding (default), small card |
| `space-4` | 16 | 1 | **Default card/panel padding**, form field gaps |
| `space-5` | 20 | 1.25 | Section subheading gap |
| `space-6` | 24 | 1.5 | Card padding (comfortable), section internal |
| `space-8` | 32 | 2 | Page section gap, large card padding |
| `space-10` | 40 | 2.5 | Major section gap |
| `space-12` | 48 | 3 | Page-level section gap |
| `space-16` | 64 | 4 | Hero, max page-section |

**Density convention** (which scale value to default to):

- Buttons: `8px 12px` (sm), `8px 14px` (md), `10px 16px` (lg) — vertical padding stays tight
- Inputs: `8px 12px` (sm), `9px 12px` (md), `10px 14px` (lg)
- Cards: `16px` (sm), `20-24px` (md), `32px` (lg / settings panel)
- Table cells: `10px 16px` (compact), `12px 16px` (default), `16px 20px` (comfortable)
- Page padding: `24px` (mobile) → `32px` (desktop) → `48px` (wide settings)

---

## 5. Border Radius

| Token | Value | Use |
|---|---|---|
| `--radius-none` | 0 | Table cells, full-bleed sections |
| `--radius-sm` | 4px | Badges, tags, small chips |
| `--radius-md` | 6px | **Default**: buttons, inputs, dropdowns, menu items |
| `--radius-lg` | 8px | Cards, panels, popovers |
| `--radius-xl` | 12px | Modals, large surfaces, sheets |
| `--radius-2xl` | 16px | Marketing-adjacent (pricing card, onboarding) |
| `--radius-full` | 9999px | Avatars, status dots, **NOT buttons** |

Rules:
- **Buttons in SaaS UIs use 6px, not pill (`9999px`).** Pills are for marketing/consumer apps. The exception is a "tag" or "chip" inside a table cell.
- **Match input and button radius.** If button = 6px, input = 6px. Visual consistency in form rows.
- **Cards never share radius with modals.** Cards = 8px, modals = 12px+. This is how the modal reads as a different elevation layer.

---

## 18. Pre-flight Checklist

Run through this before shipping any SaaS surface. Each "no" is a regression.

### Visual
- [ ] Background is `--bg-canvas` (not pure white).
- [ ] Text is `--text-primary` (not pure black).
- [ ] Brand color fills <10% of any viewport (squint test).
- [ ] No pill buttons (`border-radius: 9999px`) outside avatars and status dots.
- [ ] All borders 1px solid, color `--border-default`.
- [ ] All shadows are downward, low-spread, neutral (not colored, not glow).
- [ ] One font family for sans, one for mono. No display fonts mixed in.

### Density
- [ ] Default UI text is 13px or 14px (not 16px).
- [ ] Default button height is 32px.
- [ ] Default input height matches button height (32px).
- [ ] Table rows are 40px (default) or 32px (compact).
- [ ] Numeric columns use `font-variant-numeric: tabular-nums`.

### Interaction
- [ ] Every interactive element has hover + focus-visible + active states.
- [ ] Focus rings: `2px solid --brand-fg` outline OR `--ring-focus` box-shadow.
- [ ] Hover transitions ≤150ms.
- [ ] Modal/dialog enter ≤250ms.
- [ ] No animation on page mount (no entrance stagger).
- [ ] `prefers-reduced-motion` honored.

### Accessibility
- [ ] Body text contrast ≥4.5:1.
- [ ] UI element contrast (borders, focus rings) ≥3:1.
- [ ] Every form field has a `<label>` (or `aria-label`).
- [ ] Errors linked via `aria-describedby`, role `alert`.
- [ ] Modals trap focus, restore on close, `aria-modal="true"`.
- [ ] `⌘K`, `Esc`, `Tab`, `↑↓` work on every surface they apply to.
- [ ] Icon-only buttons have `aria-label`.

### Content
- [ ] One H1 per page.
- [ ] One primary button per surface (the rest are secondary/ghost).
- [ ] Button text is verb + object ("Save changes", not "Submit").
- [ ] Empty states have icon + declarative heading + 1-line description + primary action.
- [ ] Status badges use semantic color + dot, never solid backgrounds.

### Performance
- [ ] No CSS-in-JS in hot paths; tokens via CSS variables.
- [ ] Tables virtualize at >100 rows.
- [ ] Skeleton states for any data fetch taking >250ms.
- [ ] No layout shift on initial render (reserve space for async content).

### Dark Mode
- [ ] `.dark` class on `<html>`, set BEFORE first paint (no FOUC).
- [ ] Three-way theme toggle: system / light / dark.
- [ ] Borders are translucent or lighter in dark mode (not the same as light).
- [ ] Brand color shifts to lighter ramp step in dark mode (`--brand-600` → `--brand-fg: #A5B4FC`).
- [ ] Shadows nearly invisible in dark mode; elevation conveyed by lifted background.

---

*Last updated: synthesized from Stripe Dashboard, Linear, Vercel, Notion, Clerk, PlanetScale design patterns. Always pin to your product's brand color via the `--brand-*` scale; everything else stays intact.*

> Compact version. For layout shells, shadows, dark mode, accessibility, component code and module patterns, load the skill `frontend-design-saas-reference` only if you truly need exact code.
