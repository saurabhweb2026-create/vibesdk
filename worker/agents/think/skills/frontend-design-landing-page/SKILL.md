---
name: frontend-design-landing-page
description: Marketing landing page and conversion-focused product page reference. Use this skill when building hero sections, feature grids, pricing pages, testimonials, CTAs, footers, navigation bars, or any public-facing marketing surface. Covers a warm, professional, developer-friendly design language (cream backgrounds, generous whitespace, pill CTAs, corner-bracket card decorations) and a complete token set, animation system, and copy-paste component snippets. NOT for product/dashboard UIs — use frontend-design-saas for those.
---
# Landing Page Design System

> **AI-Optimized Design Reference** for building warm, professional, conversion-focused marketing landing pages, product pages, feature pages, and pricing pages.

This skill captures a specific landing-page register: warm cream backgrounds (NOT pure white), brown text (NOT pure black), a single bold accent for CTAs, pill-rounded buttons, and signature corner-bracket card decorations. It's tuned for developer-adjacent / B2B products — the aesthetic feels human and crafted without being playful or consumer-y. Pin the accent color to your brand; the rest of the system is reusable as-is.

> **When to use this vs. `frontend-design-saas`:** Landing-page surfaces (homepage, /features, /pricing, /about, blog) → this skill. Product UI behind the login (dashboards, settings, tables) → `frontend-design-saas`.

---

## Quick Reference (TL;DR)

```
Brand Accent:    #FF4801 (replace with your brand) / #FF7038 (hover)
Background:      #FFFBF5 (warm cream) / #121212 (dark mode)
Text:            #521000 (warm brown) / #F0E3DE (dark mode)
Border:          #EBD5C1 (cream-tinted)
Font Sans:       "Inter" / "Geist" / "Manrope" / any modern grotesk
Font Mono:       "JetBrains Mono" / "IBM Plex Mono" / "Geist Mono"
Base Spacing:    4px (multiples: 8, 12, 16, 24, 32, 48, 64)
Border Radius:   Buttons = pill (9999px), Cards = 12-16px, Inputs = 8px, Hero = 16-20px
Signature:       Corner brackets on cards (8px decorative squares at corners)
```

This is a **landing-page** register, not a product-UI register. Buttons are pills (consumer/marketing read), backgrounds are warm cream (inviting, not sterile), and decorative idioms like corner brackets are welcome. For product surfaces behind auth, use the SaaS skill instead.

---

## 2. Color System

### 2.1 Primary Palette (Light Mode)

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--lp-accent` | `#FF4801` | `rgb(255, 72, 1)` | Primary accent, CTAs, links |
| `--lp-accent-hover` | `#FF7038` | `rgb(255, 112, 56)` | Hover states |
| `--lp-accent-light` | `rgba(255, 72, 1, 0.1)` | — | Badges, light backgrounds |
| `--lp-text` | `#521000` | `rgb(82, 16, 0)` | Primary text |
| `--lp-text-muted` | `rgba(82, 16, 0, 0.6)` | — | Secondary text |
| `--lp-text-subtle` | `rgba(82, 16, 0, 0.38)` | — | Tertiary text, placeholders |
| `--lp-bg-page` | `#F5F1EB` | `rgb(245, 241, 235)` | Page background (outer) |
| `--lp-bg-100` | `#FFFBF5` | `rgb(255, 251, 245)` | Primary background |
| `--lp-bg-200` | `#FFFDFB` | `rgb(255, 253, 251)` | Card backgrounds |
| `--lp-bg-300` | `#FEF7ED` | `rgb(254, 247, 237)` | Hover backgrounds |
| `--lp-border` | `#EBD5C1` | `rgb(235, 213, 193)` | Borders, dividers |
| `--lp-border-light` | `rgba(235, 213, 193, 0.5)` | — | Subtle borders |

### 2.2 Primary Palette (Dark Mode)

| Token | Hex | Usage |
|-------|-----|-------|
| `--lp-accent` | `#F14602` | Primary accent |
| `--lp-accent-hover` | `#FF6D33` | Hover states |
| `--lp-text` | `#F0E3DE` | Primary text |
| `--lp-text-muted` | `rgba(255, 253, 251, 0.56)` | Secondary text |
| `--lp-bg-100` | `#121212` | Primary background |
| `--lp-bg-200` | `#191817` | Card backgrounds |
| `--lp-bg-300` | `#2A2927` | Hover backgrounds |
| `--lp-border` | `rgba(240, 227, 222, 0.13)` | Borders |

### 2.3 Category / Tag Colors (optional)

If your product has multiple feature categories that appear as tags or pills throughout the page (feature cards, navigation, etc.), define a small categorical palette. Keep luminance similar across the set so no single color overpowers the others.

| Slot | Primary | Background | Example use |
|----------|---------|------------|-------|
| Category A | `#0A95FF` | `rgba(10, 149, 255, 0.1)` | "Compute" / "Performance" |
| Category B | `#EE0DDB` | `rgba(238, 13, 219, 0.1)` | "Storage" / "Data" |
| Category C | `#19E306` | `#F2F5E1` | "AI" / "Intelligence" |
| Category D | `#9616FF` | `#F8EBEE` | "Media" / "Edge" |

These are placeholders — swap to your product's category palette. The goal is a small set of visually distinct accent colors used only on category labels, NEVER on primary CTAs (the brand accent owns that role).

### 2.4 Semantic Colors

| Purpose | Light Mode | Dark Mode |
|---------|------------|-----------|
| Success | `#16A34A` | `#4ADE80` |
| Warning | `#EAB308` | `#FACC15` |
| Error | `#DC2626` | `#F87171` |
| Info | `#2563EB` | `#60A5FA` |

---

## 3. Typography

### 3.1 Font Families

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", "Fira Code", "Consolas", monospace;
```

**Font Files:**
- `Kunst Grotesk Regular.woff2` (400)
- `Kunst Grotesk Medium.woff2` (500)
- `JetBrains Mono Regular.woff2` (400)

### 3.2 Type Scale

| Name | Size | Line Height | Weight | Usage |
|------|------|-------------|--------|-------|
| `xs` | 12px (0.75rem) | 1.33 | 400 | Badges, captions, footnotes |
| `sm` | 14px (0.875rem) | 1.43 | 400 | Secondary text, labels |
| `base` | 16px (1rem) | 1.5 | 400 | Body text |
| `lg` | 18px (1.125rem) | 1.56 | 400/500 | Large body, subheadings |
| `xl` | 20px (1.25rem) | 1.4 | 500 | Section titles |
| `2xl` | 24px (1.5rem) | 1.33 | 500 | Card headings |
| `3xl` | 30px (1.875rem) | 1.2 | 500 | Section headings |
| `4xl` | 36px (2.25rem) | 1.11 | 500 | Page headings |
| `5xl` | 48px (3rem) | 1.0 | 500 | Hero headings |

### 3.3 Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Normal | 400 | Body text, descriptions |
| Medium | 500 | Headings, buttons, emphasis |

### 3.4 Letter Spacing

| Context | Value | CSS |
|---------|-------|-----|
| Headings | -0.02em | `letter-spacing: -0.02em` |
| Body | Normal | `letter-spacing: normal` |
| Uppercase labels | 0.05em | `letter-spacing: 0.05em` |
| Logo text | -0.46px | `letter-spacing: -0.46px` |

### 3.5 Text Rendering

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: "kern" 1, "liga" 1;
}
```

---

## 12. Component Quick Reference

### Buttons

| Variant | Background | Text | Border |
|---------|------------|------|--------|
| Primary | `#FFFBF5` | `#FF4801` | `#FFFBF5` |
| Secondary | `#FF4801` | `#FFFBF5` | transparent |
| Ghost | transparent | `#FF4801` | `#EBD5C1` |
| Outline | transparent | `#521000` | `#EBD5C1` |

### Cards

| Variant | Background | Border | Shadow |
|---------|------------|--------|--------|
| Default | `#FFFDFB` | `#EBD5C1` | shadow-card |
| Elevated | `#FFFBF5` | `#EBD5C1` | shadow-lg |
| Interactive | `#FFFDFB` | `#EBD5C1` | hover: shadow-lg |

### Inputs

| State | Border | Shadow |
|-------|--------|--------|
| Default | `#EBD5C1` | none |
| Focus | `#FF4801` | `0 0 0 3px rgba(255,72,1,0.1)` |
| Error | `#DC2626` | `0 0 0 3px rgba(220,38,38,0.1)` |
| Disabled | `#EBD5C1` | none, opacity: 0.5 |

---

> Compact version. For exact component code (buttons, cards, forms, nav, hero, decor), load the skill `frontend-design-landing-page-reference` only if you truly need it.
