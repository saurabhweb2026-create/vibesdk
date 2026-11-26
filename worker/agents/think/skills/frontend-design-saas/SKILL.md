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

## 1. Brand Foundation

### Design Philosophy

| Principle | Description |
|-----------|-------------|
| **Users First** | Workflows, keyboard navigation, and information density beat decoration. |
| **Quiet by Default** | Neutrals dominate; the brand color is reserved for primary action, active state, and focus. |
| **Speed & Density** | Snappy transitions (≤200ms), compact row heights, no entrance animations on every page load. |
| **Opinionated Defaults** | Single canonical pattern per surface (one button hierarchy, one date picker, one empty state). |
| **Meticulous Craft** | 1px borders aligned to pixel grid, focus rings 2px offset 2px, motion uses ease-out not linear. |
| **Accessible (WCAG AA+)** | 4.5:1 text contrast, 3:1 UI element contrast, every interactive surface keyboard-reachable. |
| **Predictable** | Same component looks/behaves identically on every page; no marketing-grade variants. |

### Visual Identity Rules

- **Do not use pure black on pure white.** Use `#0F172A` on `#FFFFFF` (or `#0B1220` on `#0A0E1A` in dark mode).
- **Brand color is the accent, never the dominant.** If the brand color fills more than ~5% of the viewport in steady state, something is wrong.
- **Avoid pill buttons** (`border-radius: 9999px`) for SaaS actions. Pills read as marketing/consumer; SaaS uses `6-8px` radius for buttons and inputs.
- **No glassmorphism, no blur, no gradient borders.** The aesthetic is precision, not richness.
- **Shadows are tight and downward.** Not diffuse, not multi-direction. Reserved for floating layers (popovers, modals, dropdowns).
- **One font.** Inter / Geist / IBM Plex Sans / native system stack. Avoid mixing display + body fonts; SaaS uses a single workhorse sans.
- **Mono for IDs, code, tokens, money.** Tabular figures (`font-variant-numeric: tabular-nums`) for any column of numbers.

### Reference apps to mentally calibrate against

| Surface to build | Look at |
|---|---|
| Application shell | Linear, Vercel, Stripe Dashboard |
| Data table | Stripe `/payments`, Linear backlog, PlanetScale branches |
| Settings page | Vercel project settings, Clerk dashboard, GitHub repo settings |
| Billing / invoice | Stripe billing, Vercel usage |
| Empty state | Linear, Notion, Vercel deployments |
| Command palette | Linear ⌘K, Vercel ⌘K, Raycast |
| Auth | Clerk hosted pages, Stripe Connect onboarding |
| Onboarding checklist | Stripe Atlas, Vercel project import |

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

## 6. Shadow System (Elevation)

SaaS shadows are **tight, downward, single-direction**. They mark elevation; they do not decorate. No glows, no colored shadows, no inset highlights, no large spread radii.

### 6.1 Elevation Tokens

```css
/* Light mode */
--shadow-xs:  0 1px 2px 0 rgba(15, 23, 42, 0.04);
--shadow-sm:  0 1px 2px 0 rgba(15, 23, 42, 0.05),
              0 1px 3px 0 rgba(15, 23, 42, 0.06);
--shadow-md:  0 2px 4px -1px rgba(15, 23, 42, 0.06),
              0 4px 6px -2px rgba(15, 23, 42, 0.04);
--shadow-lg:  0 4px 6px -2px rgba(15, 23, 42, 0.05),
              0 10px 15px -3px rgba(15, 23, 42, 0.08);
--shadow-xl:  0 8px 10px -4px rgba(15, 23, 42, 0.06),
              0 20px 25px -5px rgba(15, 23, 42, 0.10);
--shadow-2xl: 0 25px 50px -12px rgba(15, 23, 42, 0.18);

/* Focus ring (NOT a shadow, but the only "glow" allowed) */
--ring-focus: 0 0 0 3px rgba(94, 106, 210, 0.20);
--ring-error: 0 0 0 3px rgba(220, 38, 38, 0.16);

/* Dark mode: shadows almost invisible; elevation is conveyed via background lightening */
--shadow-xs-dark:  0 1px 2px 0 rgba(0, 0, 0, 0.30);
--shadow-sm-dark:  0 1px 3px 0 rgba(0, 0, 0, 0.40);
--shadow-md-dark:  0 4px 8px -2px rgba(0, 0, 0, 0.50);
--shadow-lg-dark:  0 12px 20px -6px rgba(0, 0, 0, 0.55);
```

### 6.2 Elevation → Component Mapping

| Layer | Shadow | Examples |
|---|---|---|
| 0 (flat on canvas) | none | Sidebar, page body, inline rows |
| 1 (resting card) | `--shadow-xs` or none + 1px border | Default card on `--bg-canvas` |
| 2 (hovered card) | `--shadow-sm` | Card with `:hover` state |
| 3 (dropdown, popover) | `--shadow-md` | Menu, popover, select dropdown |
| 4 (modal, dialog) | `--shadow-xl` | Dialog, slide-over |
| 5 (toast over modal) | `--shadow-2xl` | Toast, command palette over modal backdrop |

### 6.3 Border-vs-Shadow Decision

For most cards, **prefer a 1px border over a shadow**. Borders are crisper at any DPI and read more "product". Use shadow only when:
- The element is floating over content (popover, modal, dropdown, toast)
- A drag-and-drop ghost is rendered
- A row is "lifted" to indicate selection while dragging

---

## 8. Layout System

### 8.1 The Canonical SaaS Shell

```
┌─────────────────────────────────────────────────────────────────┐
│ [Topbar: workspace switcher | search ⌘K | user menu] 48px       │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│              │   Page header                                    │
│              │   ┌────────────────────────────────────────────┐ │
│              │   │ Title             [primary action] [⋯ menu]│ │
│   Sidebar    │   │ Description / breadcrumb                   │ │
│   (240-     │   └────────────────────────────────────────────┘ │
│    280px)    │                                                  │
│              │   Page body (cards, tables, settings)            │
│   Nav items  │                                                  │
│   Sections   │   ┌──────────────────────────────────────────┐   │
│   Footer     │   │  Card / Panel                            │   │
│              │   └──────────────────────────────────────────┘   │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

This is the Stripe/Linear/Vercel/Notion layout. Three regions:

1. **Topbar** (48–56px): workspace/team switcher on the left, global search (`⌘K`) center or right, user menu on far right. Stays fixed during scroll.
2. **Sidebar** (240–280px): primary nav. Collapsible to a 56px icon rail on narrow screens. Stays fixed during scroll.
3. **Content** (remaining width, max ~1200px centered for readability OR full-width for tables): page header → page body.

Variations:
- **Linear-style** has no topbar — the sidebar takes the whole left edge, search lives inside the content header.
- **Notion-style** has only a sidebar, page-level breadcrumbs at top of content.
- **Settings-style** uses a *secondary* sidebar (settings nav) inside the content area, so two sidebars are visible.

### 8.2 Container Widths

| Token | px | Use |
|---|---|---|
| `--container-sm` | 640 | Single-column forms, auth, dialogs |
| `--container-md` | 768 | Settings forms, account pages |
| `--container-lg` | 1024 | Dashboard pages, default content max |
| `--container-xl` | 1280 | Wide dashboards with sidebars-in-content |
| `--container-2xl` | 1536 | Data tables, monitoring views (full-bleed) |

**Tables get `--container-2xl` or full-bleed.** Settings forms get `--container-md` (max ~720px reading column).

### 8.3 Breakpoints

| Name | min-width | Behavior |
|---|---|---|
| `sm` | 640px | Form inputs reach full width on phones |
| `md` | 768px | Two-column form layouts kick in |
| `lg` | 1024px | Sidebar appears (below this, sidebar becomes a sheet/drawer) |
| `xl` | 1280px | Sidebar stays expanded; data tables show all columns |
| `2xl` | 1536px | Multi-column dashboards |

Mobile rule: the sidebar collapses to a hamburger that opens a full-height sheet. The topbar's search and user menu remain.

### 8.4 Grid Patterns

```css
/* Page header — title left, actions right */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

/* Two-column form (label left, input right) — settings page idiom */
.form-row {
  display: grid;
  grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
  gap: 24px;
  padding: 20px 0;
  border-bottom: 1px solid var(--border-default);
}
.form-row:last-child { border-bottom: none; }
.form-row__label { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.form-row__hint  { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

/* Card grid (3-col on desktop, 2 on tablet, 1 on mobile) */
.card-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
}
@media (min-width: 768px) { .card-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .card-grid { grid-template-columns: repeat(3, 1fr); } }

/* KPI strip — auto-fit, never wider than 280, never narrower than 200 */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
```

### 8.5 Sidebar Anatomy

```
[Workspace switcher]      32px row, hover bg, dropdown chevron
─────────────────────
SECTION LABEL             11px uppercase, --neutral-500, 8px y-padding
  [icon] Item 1           36px row, 13px text, 8px gap, hover bg-100
  [icon] Item 2           selected: bg-brand-50 + brand-700 text
  [icon] Item 3
─────────────────────
SECTION LABEL
  [icon] Item 4
─────────────────────
                          (stretches to fill)
[avatar] user@email       Bottom; opens user menu upward
```

Key spec:
- Sidebar bg: `--bg-canvas` (slightly tinted from page surface) OR `--bg-surface` flat
- Nav items: 36px tall, 8px horizontal padding, 6px radius, gap 8px between icon + text
- Active item: `bg: var(--brand-50)`, `color: var(--brand-700)`, **no border, no left-accent stripe** (Linear-style minimal)
- Section labels: `text-2xs` uppercase, `--neutral-500`, 8px y-padding
- Width: 256px default, 56px collapsed (icons only)

---

## 12. Component Quick Reference

### Buttons

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| `primary` | `--brand-600` | `#FFFFFF` | none | The one primary action per surface |
| `secondary` | `--bg-surface` | `--text-primary` | `--border-default` 1px | Most actions ("Cancel", "Save", "Edit") |
| `ghost` | transparent | `--text-primary` | none | Toolbar buttons, table row actions |
| `destructive` | `#DC2626` | `#FFFFFF` | none | Delete, revoke, irreversible |
| `destructive-outline` | `--bg-surface` | `#B91C1C` | `#FCA5A5` | Less aggressive destructive |
| `link` | none | `--brand-600` | none, underline on hover | Inline navigation actions |

Sizes: `sm` (28px tall, 12px text), `md` (32px tall, 13px text — **default**), `lg` (40px tall, 14px text).

### Inputs

| State | Border | Background | Shadow |
|---|---|---|---|
| default | `--border-default` | `--bg-surface` | none |
| hover | `--border-strong` | `--bg-surface` | none |
| focus | `--brand-fg` | `--bg-surface` | `--ring-focus` |
| error | `#DC2626` | `--bg-surface` | `--ring-error` |
| disabled | `--border-default` | `--neutral-50` | none, `opacity: 0.6` |

Sizes match buttons: `sm` (28px), `md` (32px default), `lg` (40px).

### Cards

| Variant | Background | Border | Padding | Shadow |
|---|---|---|---|---|
| default | `--bg-surface` | 1px `--border-default` | 20px | none |
| interactive | `--bg-surface` | 1px `--border-default` | 20px | hover: `--shadow-sm` |
| ghost | none | none | 0 | none — for grouping without enclosure |
| elevated | `--bg-elevated` | none | 24px | `--shadow-md` |
| outline-only | none | 1px `--border-default` | 16px | none — for placeholder/empty slots |

### Badges / Status Pills

| Variant | Background | Text | Border |
|---|---|---|---|
| neutral | `--neutral-100` | `--neutral-700` | none |
| brand | `--brand-50` | `--brand-700` | none |
| success | `#DCFCE7` | `#15803D` | none |
| warning | `#FEF9C3` | `#A16207` | none |
| error | `#FEE2E2` | `#B91C1C` | none |
| info | `#DBEAFE` | `#1D4ED8` | none |

Sizing: padding `2px 8px`, font 11–12px, weight 500, radius 4px (NOT pill). Optional leading status dot.

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

> This is the compact version. The full reference (animation timings, dark mode, accessibility, complete CSS variables, module patterns, component code snippets) is the skill `frontend-design-saas-reference`. It is very large, so load it only when you truly need exact code for a component this page does not describe.
