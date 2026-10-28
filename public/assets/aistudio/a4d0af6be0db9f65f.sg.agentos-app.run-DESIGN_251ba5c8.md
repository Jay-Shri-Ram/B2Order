---
version: alpha
name: A4d0af6be0db9f65f
description: |
  OrderFlow Pro presents a dark, technology-forward interface designed for
  serious B2B operations. The design emphasizes precision and speed through a
  deep navy canvas (#070B14) anchored by a vibrant indigo accent (#6366F1). The
  visual language combines sophisticated minimalism with subtle depth, using
  layered micro-shadows and strategic color blocking to guide attention without
  visual clutter. The typography employs strong contrast—crisp white headings
  and slate-toned body text against dark surfaces—creating an interface that
  feels both premium and functional. Gradients provide decorative warmth without
  distraction, supporting the hero narrative while maintaining readability. The
  overall effect is of a system built for warehouse managers, order
  coordinators, and store owners who need to move fast.
source:
  url: "https://a4d0af6be0db9f65f.sg.agentos-app.run"
  pagesAnalyzed: 1
  extractedAt: 2026-10-28
  tokensMeasured: true
colors:
  primary: "#6366F1"
  accent: "#334155"
  canvas: "#070B14"
  surface: "#0D1320"
  on-primary: "#FFFFFF"
  ink: "#E2E8F0"
  body: "#94A3B8"
  muted: "#7C8CA5"
  hairline: "#1E293B"
  accent-1: "#111A2B"
  accent-2: "#223049"
  accent-3: "#10B981"
  accent-4: "#F59E0B"
  neutral-1: "#CBD5E1"
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -1.2px
  body-xl:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 800
    lineHeight: 1.33
    letterSpacing: -0.6px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.63
    letterSpacing: 0px
  button-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.43
    letterSpacing: 0px
  button-sm-loose:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0px
  button-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0px
  button-xs-strong:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: 0.55px
    textTransform: uppercase
  label-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  label-sm:
    fontFamily: Inter
    fontSize: 10.88px
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: 0.98px
    textTransform: uppercase
  caption-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0px
  caption-sm-strong:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: 0px
  caption-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: 1.1px
    textTransform: uppercase
  code:
    fontFamily: "JetBrains Mono"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0px
rounded:
  none: 0px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
borderWidths:
  thin: 1px
shadows:
  sm: "rgba(15, 23, 42, 0.04) 0px 1px 2px 0px, rgba(15, 23, 42, 0.18) 0px 8px 24px -12px"
  md: "rgba(0, 0, 0, 0.05) 0px 1px 2px 0px"
  lg: "rgba(99, 102, 241, 0.7) 0px 6px 18px -6px"
  xl: "rgba(2, 6, 23, 0.7) 0px 18px 50px -18px"
elevationStrategy: layered-micro
themes:
  derived: light   # the other theme is the site's measured palette
  light:
    bg: "#F7F7FF"
    surface: "#EDEDF5"
    surfaceRaised: "#E6E6ED"
    text: "#15151C"
    textMuted: "#6A6A71"
    border: "#D4D4DB"
    accent: "#5054EF"
    accentFg: "#FFFFFF"
    focusRing: "#6366F1"
    elevation: shadow
  dark:
    bg: "#070B14"
    surface: "#0D1320"
    surfaceRaised: "#202632"
    text: "#E2E8F0"
    textMuted: "#94A3B8"
    border: "#1E293B"
    accent: "#6366F1"
    accentFg: "#FFFFFF"
    focusRing: "#6366F1"
    elevation: "border+surface"
  contrastFailures:
    - "dark: accentFg on accent = 4.47:1 (needs 4.5:1)"
gradients:
  - context: hero
    kind: radial
    value: "radial-gradient(120% 120% at 10% 0%, rgba(99, 102, 241, 0.22), rgba(0, 0, 0, 0) 55%), radial-gradient(100% 100% at 100% 100%, rgba(129, 140, 248, 0.18), rgba(0, 0, 0, 0) 60%)"
  - context: section
    kind: linear
    value: "linear-gradient(135deg, rgb(99, 102, 241) 0%, rgb(129, 140, 248) 100%)"
components:
  button-primary:
    typography: "{typography.button-sm-loose}"
    textColor: "{colors.primary}"
    border: "1px solid rgba(99, 102, 241, 0.28)"
    height: 42.8125px
    padding: "9.92px 16px 9.92px 16px"
    rounded: "{rounded.sm}"
    backgroundColor: "rgba(99, 102, 241, 0.1)"
  button-filled:
    typography: "{typography.button-sm}"
    textColor: "{colors.primary}"
    height: 36px
    padding: "8px 0px 8px 0px"
    boxShadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px"
    rounded: "{rounded.xs}"
    backgroundColor: "{colors.accent}"
  button-text:
    typography: "{typography.button-sm-loose}"
    textColor: "{colors.on-primary}"
    height: 42.8125px
    padding: "9.92px 16px 9.92px 16px"
    boxShadow: "rgba(99, 102, 241, 0.7) 0px 6px 18px -6px"
    rounded: "{rounded.sm}"
  button-text-sm:
    typography: "{typography.button-sm}"
    textColor: "{colors.body}"
    height: 36px
    padding: "8px 0px 8px 0px"
    rounded: "{rounded.xs}"
  card:
    typography: "{typography.label-md}"
    textColor: "{colors.ink}"
    border: "1px solid rgba(30, 41, 59, 0.85)"
    padding: "32px 32px 32px 32px"
    boxShadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(15, 23, 42, 0.04) 0px 1px 2px 0px, rgba(15, 23, 42, 0.18) 0px 8px 24px -12px"
    rounded: "{rounded.lg}"
    backgroundColor: "rgba(13, 19, 32, 0.72)"
  card-sm:
    typography: "{typography.label-md}"
    textColor: "{colors.ink}"
    border: "1px solid rgba(30, 41, 59, 0.85)"
    padding: "16px 16px 16px 16px"
    rounded: "{rounded.md}"
    backgroundColor: "rgba(13, 19, 32, 0.72)"
states:
  button-active:
    target: button
    state: active
    transform: "scale(0.97)"
  button-hover:
    target: button
    state: hover
    filter: "brightness(1.05)"
  other-hover:
    target: other
    state: hover
    opacity: 1
breakpoints:
  - width: 375
    containerWidth: 375
    gridColumns: 0
    navLinksVisible: 0
    menuToggleVisible: false
    headingPx: 0
    bodyPx: 16
    sectionPaddingX: 0
  - width: 768
    containerWidth: 768
    gridColumns: 0
    navLinksVisible: 0
    menuToggleVisible: false
    headingPx: 0
    bodyPx: 16
    sectionPaddingX: 0
  - width: 1024
    containerWidth: 1024
    gridColumns: 2
    navLinksVisible: 0
    menuToggleVisible: false
    headingPx: 36
    bodyPx: 16
    sectionPaddingX: 0
  - width: 1280
    containerWidth: 1280
    gridColumns: 1
    navLinksVisible: 0
    menuToggleVisible: false
    headingPx: 48
    bodyPx: 16
    sectionPaddingX: 0
  - width: 1440
    containerWidth: 1440
    gridColumns: 1
    navLinksVisible: 0
    menuToggleVisible: false
    headingPx: 48
    bodyPx: 16
    sectionPaddingX: 0
coverage:
  statesFound: 10
  gradientsFound: 2
  rolesUnassigned: 5
  archetypesUnnamed: 0
  archetypesDetected: 0
  responsiveMeasured: true
  stylesheetsBlocked: true
  semanticRampDeclared: false
---

# Design System Inspired by OrderFlow Pro

## 1. Visual Theme & Atmosphere

OrderFlow Pro presents a dark, technology-forward interface designed for serious B2B operations. The design emphasizes precision and speed through a deep navy canvas (`{colors.canvas}` — `#070B14`) anchored by a vibrant indigo accent (`{colors.primary}` — `#6366F1`). The visual language combines sophisticated minimalism with subtle depth, using layered micro-shadows and strategic color blocking to guide attention without visual clutter. The typography employs strong contrast—crisp white headings and slate-toned body text against dark surfaces—creating an interface that feels both premium and functional. Gradients provide decorative warmth without distraction, supporting the hero narrative while maintaining readability. The overall effect is of a system built for warehouse managers, order coordinators, and store owners who need to move fast.

**Key Characteristics**
- Deep, space-like dark canvas with carefully graded surface layers
- Bold, indigo primary accent used for CTAs, brand identity, and interactive focus states
- High-contrast typography hierarchy with aggressive negative tracking on display sizes
- Layered micro-elevation strategy: depth through color-blocking and barely-visible shadows
- Minimal but intentional use of secondary accents and decorative gradients
- Professional, no-nonsense interaction model—subtle but responsive feedback

## 2. Color Palette & Roles

### Primary
- **Primary / Brand** (`{colors.primary}` — `#6366F1`): The defining accent color. Used for primary CTAs, active states, brand mark, hero accents, focus indicators, and interactive elevations. Appears in button fills, shadow overlays, and gradient compositions.
- **On Primary** (`{colors.on-primary}` — `#FFFFFF`): Label and foreground text color when placed on brand-colored surfaces.

### Accent Colors
- **Secondary Accent** (`{colors.accent}` — `#334155`): Hero band and supporting accent role. Provides tonal contrast without competing with primary.
- **Decorative Accent 1** (`{colors.accent-1}` — `#111A2B`): Unassigned decorative color; used for atmospheric or layered design elements.
- **Decorative Accent 2** (`{colors.accent-2}` — `#223049`): Unassigned decorative color; used for atmospheric or layered design elements.
- **Decorative Accent 3** (`{colors.accent-3}` — `#10B981`): Unassigned decorative color; appears in atmospheric contexts only.
- **Decorative Accent 4** (`{colors.accent-4}` — `#F59E0B`): Unassigned decorative color; appears in atmospheric contexts only.

### Neutral Scale
- **Canvas** (`{colors.canvas}` — `#070B14`): Default page background. The foundation of all layouts.
- **Surface** (`{colors.surface}` — `#0D1320`): Card and panel background. Slightly lighter than canvas to create containment and depth.
- **Ink** (`{colors.ink}` — `#E2E8F0`): Primary heading and strong emphasis text color.
- **Body** (`{colors.body}` — `#94A3B8`): Standard body copy and descriptive text.
- **Muted** (`{colors.muted}` — `#7C8CA5`): Captions, secondary text, and de-emphasized content.
- **Neutral** (`{colors.neutral-1}` — `#CBD5E1`): Rarely used secondary neutral; available for future expansion.

### Surface & Borders
- **Hairline** (`{colors.hairline}` — `#1E293B`): 1px borders and dividers. Subtle but defined, separating containers and sections without harsh contrast.

## 3. Typography Rules

### Font Family
- **Primary Font**: Inter (https://fonts.googleapis.com/) — all headings, body, buttons, and UI labels.
- **Code Font**: JetBrains Mono (https://fonts.googleapis.com/) — monospaced content and code blocks.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|---|---|---|---|---|---|---|
| **Display** | Inter | 48px | 800 | 1.0 | −1.2px | Hero headline; aggressive negative tracking for visual punch |
| **Body XL** | Inter | 24px | 800 | 1.33 | −0.6px | Large emphasis text; negative tracking preserved |
| **Label MD** | Inter | 16px | 400 | 1.5 | 0px | Input labels and form captions |
| **Body LG** | Inter | 16px | 400 | 1.63 | 0px | Standard body copy and descriptions |
| **Button SM** | Inter | 14px | 600 | 1.5 | 0px | Primary button text and CTAs (loose line-height variant) |
| **Button SM** | Inter | 14px | 600 | 1.43 | 0px | Secondary button text (compact line-height variant) |
| **Caption SM** | Inter | 12px | 400 | 1.33 | 0px | Footnotes, timestamps, and helper text |
| **Caption SM Strong** | Inter | 12px | 700 | 1.33 | 0px | Emphasized captions and small labels |
| **Code** | JetBrains Mono | 12px | 400 | 1.33 | 0px | Code blocks and monospaced content |
| **Label SM** | Inter | 10.88px | 700 | 1.5 | 0.98px | Uppercase small labels; used for form fields and badges |
| **Button XS** | Inter | 11px | 600 | 1.5 | 0px | Small button and link text |
| **Button XS Strong** | Inter | 11px | 700 | 1.5 | 0.55px | Uppercase small button text with expanded letter-spacing |
| **Caption XS** | Inter | 11px | 700 | 1.5 | 1.1px | Uppercase micro-text and status indicators |

### Principles
- Negative tracking (−0.6px to −1.2px) on display and XL sizes creates visual urgency and polish; never remove or round to zero.
- All button text uses Inter 600 weight minimum; small buttons step up to 700 weight when uppercase.
- Captions are consistently smaller than body, stepping from 12px down to 11px, with consistent line-height ratios.
- Code uses JetBrains Mono at 12px with 1.33 line-height to maintain readability in dense technical contexts.
- Line-height ratios stay consistent within role families (e.g., all buttons at 1.43–1.5 LH) for stable visual rhythm.

## 4. Component Stylings

### Buttons

#### Primary Variant
- **Background**: Transparent indigo with 10% opacity (`rgba(99, 102, 241, 0.1)`)
- **Text Color**: `#6366F1`
- **Border**: `1px solid rgba(99, 102, 241, 0.28)`
- **Padding**: `9.92px 16px`
- **Font**: `{typography.button-sm}` (14px, 600 weight, 1.43 LH)
- **Border Radius**: `{rounded.sm}` (12px)
- **Box Shadow**: None
- **Width**: 412px (full-width in container)
- **Height**: 42.8125px

#### Filled Variant (Secondary)
- **Background**: `#334155`
- **Text Color**: `#6366F1`
- **Border**: None
- **Padding**: `8px 0px`
- **Font**: `{typography.button-sm}` (14px, 600 weight, 1.5 LH)
- **Border Radius**: `{rounded.xs}` (8px)
- **Box Shadow**: `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px`
- **Width**: 202px
- **Height**: 36px

#### Text Variant (Ghost / Tertiary)
- **Background**: Transparent
- **Text Color**: `#FFFFFF`
- **Border**: `1px solid transparent`
- **Padding**: `9.92px 16px`
- **Font**: `{typography.button-sm}` (14px, 600 weight, 1.43 LH)
- **Border Radius**: `{rounded.sm}` (12px)
- **Box Shadow**: `rgba(99, 102, 241, 0.7) 0px 6px 18px -6px` (glowing indigo elevation)
- **Width**: 412px (full-width in container)
- **Height**: 42.8125px

#### Text SM Variant (Tertiary, Compact)
- **Background**: Transparent
- **Text Color**: `#94A3B8`
- **Border**: None
- **Padding**: `8px 0px`
- **Font**: `{typography.button-sm}` (14px, 600 weight, 1.5 LH)
- **Border Radius**: `{rounded.xs}` (8px)
- **Box Shadow**: None
- **Width**: 202px
- **Height**: 36px

**Button States** (from stylesheet extraction):
- **Hover**: `filter: brightness(1.05)`, box-shadow `0 10px 26px -8px rgb(var(--acc-rgb)/.85)` — brightens and elevates with brand color glow
- **Active**: `transform: scale(0.97)` — subtle press feedback
- Hover state also applies background color shifts for filled variants (e.g., to `#131D30` or `#DC2626` context-dependent)

### Cards & Containers

#### Default Card
- **Background**: `rgba(13, 19, 32, 0.72)` (semi-transparent surface)
- **Text Color**: `#E2E8F0`
- **Border**: `1px solid rgba(30, 41, 59, 0.85)`
- **Border Radius**: `{rounded.lg}` (20px)
- **Padding**: `{spacing.xxl}` (32px all sides)
- **Font**: `{typography.body-lg}` (16px, 400 weight, 1.63 LH)
- **Box Shadow**: `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(15, 23, 42, 0.04) 0px 1px 2px 0px, rgba(15, 23, 42, 0.18) 0px 8px 24px -12px`
- **Width**: 478px
- **Height**: 597.344px (content-dependent)

#### Small Card
- **Background**: `rgba(13, 19, 32, 0.72)`
- **Text Color**: `#E2E8F0`
- **Border**: `1px solid rgba(30, 41, 59, 0.85)`
- **Border Radius**: `{rounded.md}` (16px)
- **Padding**: `{spacing.md}` (16px all sides)
- **Font**: `{typography.body-lg}` (16px, 400 weight, 1.63 LH)
- **Box Shadow**: None
- **Width**: 218px
- **Height**: 102px

### Inputs & Forms

#### Text Input
- **Background**: Transparent (inherited from surface)
- **Text Color**: `#E2E8F0`
- **Border**: `1px solid {colors.hairline}`
- **Border Radius**: `{rounded.sm}` (12px)
- **Padding**: Input-specific; align with label spacing
- **Font**: `{typography.label-md}` (16px, 400 weight, 1.5 LH)
- **Focus State**: Box-shadow `0 0 0 4px rgb(var(--acc-rgb)/.16)` with border-color `rgb(var(--acc-rgb)/.85)`

#### Label
- **Font**: `{typography.label-sm}` (10.88px, 700 weight, 1.5 LH)
- **Letter Spacing**: 0.98px (uppercase, expanded tracking)
- **Text Color**: `#94A3B8`
- **Transformation**: `text-transform: uppercase`

### Navigation
- **Text Color**: `#E2E8F0` or `#94A3B8` (depending on emphasis)
- **Box Shadow** (on scrolled state): `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(2, 6, 23, 0.7) 0px 18px 50px -18px`
- **Link Hover**: Color shifts to `#6B7280` or emphasis re-asserts to `#E2E8F0`

## 5. Layout Principles

### Spacing System
The base unit is `{spacing.xs}` (8px). All spacing increments follow a geometric scale:
- **{spacing.xxs}}** = 4px — micro-adjustments, tight icon-to-text gaps
- **{spacing.xs}** = 8px — component internal padding, tight grouping
- **{spacing.sm}** = 12px — button internal horizontal padding, input padding
- **{spacing.md}** = 16px — standard section margins, card padding (small)
- **{spacing.lg}** = 20px — section separators, moderate gaps
- **{spacing.xl}** = 24px — major section spacing, hero spacing
- **{spacing.xxl}** = 32px — large card padding, full-width section gutters
- **{spacing.xxxl}** = 40px — maximum external spacing, feature grid margins

Use tighter increments (xxs–sm) within components; reserve lg–xxxl for section-to-section rhythm.

### Grid & Container
- **Max Width**: 1440px at viewport 1440px and above.
- **Content Columns**: Single-column layout across all breakpoints at the page level. Interior grids (e.g., feature cards) collapse from 2 columns at 1024px to 1 column on smaller viewports.
- **Section Padding X**: 0px (content extends to viewport edge); padding is managed internally via card and container margins.
- **Aspect Ratio**: Hero section and feature cards use viewport-aware sizing; no fixed aspect ratio constraints.

### Whitespace Philosophy
Whitespace is strategic, not generous. The system uses layered depth (color-blocking and micro-shadows) to avoid relying on excessive padding. Cards maintain consistent `{spacing.xxl}` (32px) internal padding on large breakpoints, collapsing to `{spacing.md}` (16px) on small screens. Sections are separated by `{spacing.xl}` to `{spacing.xxxl}` gaps, creating visual rhythm without emptiness. The dark canvas ensures that whitespace reads as silence rather than void.

### Border Radius Scale
- **{rounded.none}}** = 0px — sharp edges (used sparingly for specific accents)
- **{rounded.xs}}** = 8px — secondary buttons, small interactive elements
- **{rounded.sm}}** = 12px — primary buttons, inputs, and text fields
- **{rounded.md}}** = 16px — small cards and secondary containers
- **{rounded.lg}}** = 20px — default cards and major containers

### Border Widths
- **Thin** = 1px — used for all visible borders (card edges, input outlines, dividers). The only border-width in active use across the system.

## 6. Depth & Elevation

| Level | Treatment | Use |
|---|---|---|
| **Flat** | No shadow; color-blocking only | Body text, secondary UI, inputs at rest |
| **Micro** | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` | Secondary buttons, minor elevation |
| **Card Base** | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(15, 23, 42, 0.04) 0px 1px 2px 0px, rgba(15, 23, 42, 0.18) 0px 8px 24px -12px` | Default cards and modals |
| **Glow** | `rgba(99, 102, 241, 0.7) 0px 6px 18px -6px` | Primary ghost buttons, active focus states |
| **Navigation Scroll** | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(2, 6, 23, 0.7) 0px 18px 50px -18px` | Sticky navigation when scrolled |

**Shadow Philosophy**  
The system employs layered-micro elevation: multiple near-transparent shadow layers create barely-perceptible depth. The primary strategy is **color-blocking**—surface containers sit on a darker canvas, and the hairline border (`{colors.hairline}`) provides semantic separation. Shadows are reserved for high-priority interactions (cards, button hover states) and are always subtle. The indigo glow (`rgba(99, 102, 241, 0.7)`) is the only chromatic shadow, used exclusively for brand-aligned CTAs and focus states.

### Opacity Levels
- **40% (0.40)** — Used for semi-transparent overlays, inactive states, and subtle background blends. Example: `rgba(99, 102, 241, 0.1)` for button backgrounds, `rgba(30, 41, 59, 0.85)` for borders.

### Z-index / Layering
- **Base** = 2 — Standard document flow
- **Dropdown** = 30, 40, 50, 70 — Stacked dropdowns and popovers (ascending priority)
- **Sticky** = 120, 200 — Sticky headers and fixed overlays (sticky at 120, high-priority stickies at 200)

Use z-index sparingly. The layering scale supports multi-tier dropdowns and one primary sticky header; modals should layer at z-index 200+ to stay above all interactive elements.

## 7. Do's and Don'ts

### Do
- **Use the indigo primary (`#6366F1`) for all CTAs.** It is the brand's visual anchor and must remain consistent across all interactive elements.
- **Preserve negative letter-spacing on display and XL typography.** The −1.2px and −0.6px tracking is intentional and defines the brand's premium feel.
- **Stack layered shadows for elevation, not single heavy shadows.** The micro-layering approach keeps depth subtle and sophisticated.
- **Default to dark surfaces and light text.** The system is built for dark-first, with high contrast for readability.
- **Use the full spacing scale deliberately.** Each increment has a purpose; avoid inventing new values.
- **Apply border-radius consistently by component role.** Buttons stay at 8px or 12px; cards at 16px or 20px.
- **Test focus states and hover states on all interactive elements.** The extraction provides specific state CSS; implement all of it.
- **Use the hairline border (`#1E293B`) to separate containers and sections.** It is subtle, readable, and maintains visual cohesion.

### Don't
- **Do not use rounded corners of arbitrary sizes.** The published scale (0, 8, 12, 16, 20px) is exhaustive.
- **Do not lighten the canvas or invert to a light mode without explicit design guidance.** The dark palette is fundamental to the brand.
- **Do not add new accent colors beyond the six provided.** The decorative accents (emerald, amber) are rarely used and should not expand.
- **Do not remove or modify letter-spacing on typography.** Negative tracking is not a rendering artifact; it is a deliberate design choice.
- **Do not apply heavy, opaque shadows.** All shadows use low opacity and layering; a single large shadow breaks the system's micro-elevation philosophy.
- **Do not change button border-radius per-instance.** Use the component role baseline (xs or sm).
- **Do not invent interaction states.** Only implement states that were extracted from the site's stylesheets (hover, active, focus, etc.).
- **Do not use the neutral color (`#CBD5E1`) as primary text.** It is reserved for secondary or future roles; use ink (`#E2E8F0`) for emphasis and body (`#94A3B8`) for standard copy.

## 8. Responsive Behavior

### Breakpoints

| Viewport | Content Width | Grid Columns | Heading Size | Body Size | Section Padding X |
|---|---|---|---|---|---|
| 375px (Mobile) | 375px | 1 | 0px | 16px | 0px |
| 768px (Tablet) | 768px | 1 | 0px | 16px | 0px |
| 1024px (Desktop) | 1024px | 2 | 36px | 16px | 0px |
| 1280px (Wide) | 1280px | 1 | 48px | 16px | 0px |
| 1440px+ (Full) | 1440px | 1 | 48px | 16px | 0px |

**Breakpoint Strategy**: The site uses a content-first approach. The heading size shifts from 0px (mobile, not measured) to 36px at 1024px and settles at full 48px (`{typography.display}`) from 1280px onward. The grid collapses from 2 columns at 1024px to 1 column at 1280px, indicating a shift from side-by-side card layouts to stacked or single-column flows. Body text remains constant at 16px across all breakpoints.

### Touch Targets
- **Minimum Touch Height**: Buttons and inputs should maintain at least 36–42px height to accommodate thumb and finger interaction.
- **Minimum Touch Width**: 44px width minimum for interactive elements; 202px is measured for secondary buttons, which exceeds the minimum.
- **Touch Spacing**: Interactive elements should be separated by at least `{spacing.sm}` (12px) to avoid mis-taps.

### Collapsing Strategy
1. **1440px–1280px**: Single-column hero and feature cards; no horizontal scrolling.
2. **1024px**: Grid shifts to 2-column layout for card groupings (e.g., feature cards in a 2×2 grid); heading size steps down to 36px.
3. **768px (Tablet)**: Revert to 1-column flow; all cards stack vertically. Section padding remains 0px; rely on card internal padding and spacing values.
4. **375px (Mobile)**: Full single-column layout; body and heading sizes stay constant (headings not measured on mobile, likely inherit from tablet).

All layouts maintain 0px section padding-x, meaning content extends to the viewport edge. Manage gutters and breathing room via card padding (`{spacing.xxl}` or `{spacing.md}`) and section-level margin separators (`{spacing.xl}` to `{spacing.xxxl}`).

## 9. Agent Prompt Guide

### Quick Color Reference
Use this when building UI or debugging color roles:
- **Primary CTA**: Indigo (`{colors.primary}` — `#6366F1`)
- **Page Background**: Canvas (`{colors.canvas}` — `#070B14`)
- **Card Background**: Surface (`{colors.surface}` — `#0D1320`)
- **Heading Text**: Ink (`{colors.ink}` — `#E2E8F0`)
- **Body Text**: Body (`{colors.body}` — `#94A3B8`)
- **Secondary Text**: Muted (`{colors.muted}` — `#7C8CA5`)
- **Borders**: Hairline (`{colors.hairline}` — `#1E293B`)
- **On Primary**: White (`{colors.on-primary}` — `#FFFFFF`)
- **Secondary Accent**: Slate (`{colors.accent}` — `#334155`)

### Iteration Guide
1. **Typography is tight and intentional**: All sizes, weights, and letter-spacing values are fixed. Do not approximate or normalize; use the extracted values exactly.
2. **Buttons have four stable variants**: primary (transparent indigo), filled (slate), text/ghost (white with glow), and text-sm (compact, muted). Match the variant's exact padding, border-radius, and shadow.
3. **Cards use layered shadows and transparent backgrounds**: `rgba(13, 19, 32, 0.72)` with a 1px hairline border and the card-level box-shadow. Do not simplify to flat or solid fills.
4. **Spacing is an 8px scale**: xxs (4px), xs (8px), sm (12px), md (16px), lg (20px), xl (24px), xxl (32px), xxxl (40px). Every layout decision should reference this scale.
5. **Focus and hover states are mandatory**: Inputs get a 4px colored glow on focus; buttons brighten and glow on hover; apply these via CSS or component state handlers.
6. **Border-radius varies by component**: Buttons at 8–12px, inputs at 12px, cards at 16–20px. Do not use rounded corners outside these values.
7. **Elevation is achieved through layering, not weight**: Shadows are stacked near-transparent layers; only the glow shadow uses chromatic indigo. Heavy or opaque shadows are anti-patterns.
8. **Responsive breakpoints are 375, 768, 1024, 1280, 1440px**: At each breakpoint, re-evaluate grid columns, heading size, and overall layout; the collapsing strategy above ensures mobile readability.
9. **Color opacity is used strategically**: Buttons and borders use semi-transparent indigo or slate (10%–85% opacity ranges). Use `rgba()` syntax to layer color intentionally.
10. **The dark palette is non-negotiable**: Canvas, surface, and ink establish a dark-first aesthetic. Do not lighten or invert without explicit design review.

## 10. Known Gaps

- **No semantic status colors**: The site does not expose error, success, warning, or info color roles. Do not invent a semantic ramp; if these roles are needed in extended UI, they must be added via design review, not inference.
- **No dark-mode data**: The extracted theme is the only theme measured. If a light mode exists, it was not visible during extraction. Assume dark-only unless otherwise specified.
- **Incomplete interaction state coverage**: Hover, active, and focus states were extracted for buttons and inputs only. Other component interactions (e.g., badge hover, list item focus, tooltip triggers) were not measured and should be inferred conservatively or added during implementation review.
- **5 extracted colors with no assigned role**: `{colors.accent-1}`, `{colors.accent-2}`, `{colors.accent-3}`, and `{colors.accent-4}` appear in gradients or decorative contexts only. Their purpose is atmospheric; do not repurpose them as semantic roles.
- **Limited component library coverage**: Only buttons, cards, inputs, and navigation were extracted. Other components (modals, tabs, popovers, tooltips, dropdowns, pagination, etc.) were not measured. Extend the system using the spacing, typography, and shadow rules as guides.
- **No animation or transition data**: Extracted CSS does not include duration, easing, or transform sequences. The `scale(0.97)` on button active state is the only motion behavior recorded.
- **Single-page extraction**: Only the login/hero page was analyzed. Surfaces behind authentication (dashboard, order management, settings) were not visited and may contain additional components, color roles, or responsive patterns.
- **Cross-origin stylesheet limitations**: Some CSS rules may have been blocked or unreadable due to cross-origin restrictions. Component state depth (e.g., disabled states, loading states, error states beyond the four button variants) may be incomplete.
- **No gradient start/stop positions by component**: Gradients were extracted as verbatim CSS but not linked to specific components or use contexts. The two gradients provided (hero radial, section linear) are decorative; clarify their exact placement in implementation.
- **No specific touch gesture handling**: Tap, swipe, and multi-touch behaviors were not extracted. Design for standard web interactions (click, focus, hover) unless gesture-specific UX is explicitly required.

---

**Document Version**: Extracted from OrderFlow Pro (https://a4d0af6be0db9f65f.sg.agentos-app.run)  
**Page Title**: OrderFlow Pro — Cloud POS & Order Engine  
**Measurement Date**: Analysis of login and hero page  
**Token Count**: 14 colors, 12 typography roles, 8 spacing increments, 5 border-radius values, 1 border-width, 5 shadow elevations, 2 gradients, 8 z-index layers  
**Extraction Notes**: Dark-first B2B SaaS design; indigo-accent system with sophisticated micro-elevation strategy and tight negative tracking on display typography.