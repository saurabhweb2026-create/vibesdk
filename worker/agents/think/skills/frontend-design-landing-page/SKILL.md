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

## 1. Brand Foundation

### Design Philosophy

| Principle | Description |
|-----------|-------------|
| **Warm but Technical** | Cream tones soften technical content |
| **Professional yet Approachable** | Modern typography, generous whitespace |
| **Developer-Focused** | Monospace for code, terminal aesthetics |
| **Performance-Oriented** | Smooth animations convey speed |

### Visual Identity

- **Never use pure white** (`#FFFFFF`) for backgrounds — always warm cream (`#FFFBF5`)
- **Never use pure black** (`#000000`) for text — always warm brown (`#521000`)
- **Orange is the accent**, not the dominant color
- **Corner brackets** on cards are a signature decorative element
- **Dot patterns** and **dashed lines** add visual texture

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

## 4. Spacing System

### 4.1 Base Unit

```css
--spacing-unit: 4px;
```

### 4.2 Spacing Scale

| Token | Value | Pixels | Common Usage |
|-------|-------|--------|--------------|
| `0` | 0 | 0px | Reset |
| `0.5` | 0.125rem | 2px | Tiny gaps |
| `1` | 0.25rem | 4px | Tight spacing |
| `1.5` | 0.375rem | 6px | Small gaps |
| `2` | 0.5rem | 8px | Default small padding |
| `3` | 0.75rem | 12px | Input padding, card gaps |
| `4` | 1rem | 16px | Standard padding |
| `5` | 1.25rem | 20px | Medium spacing |
| `6` | 1.5rem | 24px | Section padding (mobile) |
| `8` | 2rem | 32px | Large padding |
| `10` | 2.5rem | 40px | Section gaps |
| `12` | 3rem | 48px | Large section gaps |
| `16` | 4rem | 64px | Hero padding |
| `20` | 5rem | 80px | Major sections |
| `24` | 6rem | 96px | Max section spacing |

### 4.3 Common Spacing Patterns

```css
/* Card padding */
padding: 24px;  /* p-6 */

/* Input padding */
padding: 12px;  /* p-3 */

/* Button padding */
padding: 12px 24px;  /* py-3 px-6 */

/* Section padding (responsive) */
padding: 32px 16px;  /* Mobile */
padding: 48px 32px;  /* Tablet */
padding: 64px 48px;  /* Desktop */

/* Grid gaps */
gap: 16px;  /* Cards */
gap: 24px;  /* Sections */
```

---

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Small badges |
| `rounded` | 6px | Tags, small elements |
| `rounded-md` | 8px | Inputs |
| `rounded-lg` | 12px | Icon containers, panels |
| `rounded-xl` | 16px | Hero sections |
| `rounded-2xl` | 20px | Large hero sections |
| `rounded-full` | 9999px | Buttons, pills, avatars |
| `rounded-none` | 0 | Cards (sharp edges) |

### Common Patterns

```css
/* Buttons - always fully rounded */
border-radius: 9999px;

/* Cards - sharp edges */
border-radius: 0;

/* Inputs */
border-radius: 8px;

/* Hero sections (desktop) */
border-radius: 16px;

/* Progress bars */
border-radius: 9999px;

/* Icon containers */
border-radius: 8px;
```

---

## 6. Shadow System

### 6.1 Shadow Stack (Signature Effect)

Used on hero sections and elevated cards for depth with inner glow.

```css
/* Light Mode */
--shadow-stack: 
  1px 6px 6px 0 rgba(255, 255, 255, 0.2) inset,
  0 0 0px 0 rgba(255, 255, 255, 0.35) inset,
  0 4px 12px 0 rgba(0, 0, 0, 0.02),
  0 2px 12px 0 rgba(0, 0, 0, 0.03);

/* Dark Mode */
--shadow-stack-dark:
  1px 6px 16px 0 rgba(255, 255, 255, 0.05) inset,
  0 4px 12px 0 rgba(0, 0, 0, 0.02),
  0 2px 12px 0 rgba(0, 0, 0, 0.03);
```

### 6.2 Utility Shadows

```css
/* Subtle shadow for cards */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* Standard card shadow */
--shadow-card: 
  0 1px 3px rgba(82, 16, 0, 0.04),
  0 4px 12px rgba(82, 16, 0, 0.02);

/* Elevated shadow */
--shadow-lg: 
  0 10px 15px -3px rgba(0, 0, 0, 0.1),
  0 4px 6px -4px rgba(0, 0, 0, 0.1);

/* Focus ring shadow */
--shadow-focus: 0 0 0 3px rgba(255, 72, 1, 0.2);
```

---

## 8. Layout System

### 8.1 Container Widths

| Token | Value | Usage |
|-------|-------|-------|
| `--container-sm` | 640px | Narrow content |
| `--container-md` | 768px | Medium content |
| `--container-lg` | 1024px | Standard content |
| `--container-xl` | 1200px | Wide content |
| `--container-2xl` | 1480px | Full-width sections |

### 8.2 Breakpoints

| Name | Min Width | Usage |
|------|-----------|-------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### 8.3 Grid Patterns

```css
/* 2-column grid */
display: grid;
grid-template-columns: repeat(2, 1fr);
gap: 16px;

/* 3-column grid */
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 16px;

/* 4-column grid */
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 16px;

/* Calculator layout (2 columns, different widths) */
display: grid;
grid-template-columns: 1fr 1fr;
gap: 24px;

/* Responsive grid */
display: grid;
grid-template-columns: repeat(1, 1fr);  /* Mobile */
grid-template-columns: repeat(2, 1fr);  /* md: */
grid-template-columns: repeat(3, 1fr);  /* lg: */
```

### 8.4 Bento Grid

```css
/* Bento layout with varying sizes */
display: grid;
grid-template-columns: repeat(12, 1fr);
gap: 8px;

/* Bento cell sizes */
.bento-sm { grid-column: span 4; }    /* 1/3 width */
.bento-md { grid-column: span 6; }    /* 1/2 width */
.bento-lg { grid-column: span 8; }    /* 2/3 width */
.bento-full { grid-column: span 12; } /* Full width */
```

---

## 11. Decorative Elements

### 11.1 Corner Brackets

Signature decorative element for cards:

```css
/* Corner bracket container */
.corner-brackets {
  position: relative;
}

/* Individual bracket */
.corner-bracket {
  position: absolute;
  width: 8px;
  height: 8px;
  border: 1px solid var(--lp-border);
  border-radius: 1.5px;
  background: var(--lp-bg-100);
}

/* Positions */
.corner-bracket.top-left { top: -4px; left: -4px; }
.corner-bracket.top-right { top: -4px; right: -4px; }
.corner-bracket.bottom-left { bottom: -4px; left: -4px; }
.corner-bracket.bottom-right { bottom: -4px; right: -4px; }
```

### 11.2 Dot Pattern Background

```css
.dot-pattern {
  background-image: radial-gradient(
    circle,
    var(--lp-border) 0.75px,
    transparent 0.75px
  );
  background-size: 12px 12px;
}
```

### 11.3 Dashed Line Borders

```css
/* Vertical dashed line */
.dashed-line-vertical {
  width: 1px;
  background-image: linear-gradient(
    to bottom,
    var(--lp-border) 50%,
    transparent 50%
  );
  background-size: 1px 16px;
  background-repeat: repeat-y;
}

/* Horizontal dashed line */
.dashed-line-horizontal {
  height: 1px;
  background-image: linear-gradient(
    to right,
    var(--lp-border) 50%,
    transparent 50%
  );
  background-size: 16px 1px;
  background-repeat: repeat-x;
}
```

### 11.4 Gradient Masks

```css
/* Fade edges */
.fade-left {
  mask-image: linear-gradient(to right, transparent, black 20%);
}

.fade-right {
  mask-image: linear-gradient(to left, transparent, black 20%);
}

.fade-both {
  mask-image: linear-gradient(
    to right,
    transparent,
    black 15%,
    black 85%,
    transparent
  );
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

## 13. File Structure Recommendation

```
project/
├── styles/
│   ├── tokens.css          # CSS custom properties
│   ├── base.css            # Reset, typography, global styles
│   ├── components/
│   │   ├── buttons.css
│   │   ├── cards.css
│   │   ├── forms.css
│   │   ├── navigation.css
│   │   └── calculator.css
│   └── utilities.css       # Helper classes
├── fonts/
│   ├── Kunst Grotesk Regular.woff2
│   ├── Kunst Grotesk Medium.woff2
│   └── JetBrains Mono Regular.woff2
└── components/             # React/Vue components
    ├── Button.tsx
    ├── Card.tsx
    ├── Input.tsx
    └── Calculator/
        ├── InputPanel.tsx
        ├── OutputPanel.tsx
        └── ComparisonBar.tsx
```

---

> This is the compact version. The full reference (forensic analysis and the BTN, CARD, FORM, NAV, HERO and DECOR component snippets) is the skill `frontend-design-landing-page-reference`. It is very large, so load it only when you truly need the exact code of a component.
