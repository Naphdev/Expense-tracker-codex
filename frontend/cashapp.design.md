---
version: alpha
name: Cash App
website: "https://cash.app"
description: >-
  Cash App's marketing canvas is the fintech inversion — the brand voltage is the canvas itself, not the CTA. A fully-saturated Cash Green `#00e013` floods the entire above-the-fold band as the background colour, with a black pill `#000000` and a white-outlined pill carrying the only two buttons in the top nav. Type is Cash Sans across every tier at the single weight 400 — a 56px hero ("The way money should work") with `lineHeight: 53.2px` and `letterSpacing: -1.68px`, dropping to 40px h2 with `-1.2px`, 18px body with `-0.54px`, and a 12px button label with `-0.24px`. Pill radius is `999px`, mid-card radius is `100px`, and avatars are perfect circles at `50%`. There is no secondary accent — black, white, green, and a single neutral gray `#999999` do every job on the page.

seo:
  title: "Cash App Brand Colors: Electric Green and Black Pills"
  metaDescription: "Cash App floods its hero with green #00e013, uses black 999px pill CTAs and runs Cash Sans at weight 400 everywhere. Tokens for React and AI tools."
  highlights:
    - "Brand voltage as canvas — `#00e013` floods the full hero band as background, not as a CTA fill"
    - "Black pill as primary CTA — `#000000` background, white text, `999px` radius, `0px 20px` padding at 46px height"
    - "Single-weight Cash Sans — every tier from 56px hero to 12px button label renders at weight 400"
    - "Negative tracking ladder — `-1.68px` at 56px, `-1.20px` at 40px, `-0.54px` at 18px body"
    - "No secondary accent — black, white, green, and one neutral gray `#999999` do every job on the page"
  tags:
    - "Fintech & Crypto"
    - "Banking & Payments"
  lastUpdated: "2026-05-13"
  author:
    name: "Dov Azencot"
    url: "https://x.com/dovazencot"
  opening: |
    Cash App's marketing canvas inverts the fintech default. Where Stripe paints indigo onto a white canvas and Monzo paints navy onto white, Cash App paints the entire canvas Cash Green `#00e013` — a fully-saturated digital green at `oklch(0.79 0.26 143)` — and lets black and white do everything else. The hero band fills the viewport with green; an iPhone mockup floats centre on white-ish app surfaces; the brand wordmark sits inside a black rounded-square at the top left; and the only two buttons on the page are a white-outlined pill ("Sign up") and a black-filled pill ("Log in") in the top-right nav. Display type is Cash Sans at a single weight — 400 — across every size from the 56px hero down to the 12px button label, with a tight negative-tracking ladder from `-1.68px` to `-0.24px`.

    This page packages the Cash App marketing canvas into a single DESIGN.md file built on the Google Labs DESIGN.md specification. Inside the spec: 18 colour tokens grouped into brand-canvas, ink, on-green, and structural roles; 10 typography tokens spanning a 56px hero down to a 12px label with the full Cash Sans weight-400 ladder including a 25px lead paragraph and a 39px section heading; five radius tokens including the load-bearing `999px` pill, a `100px` mid-card corner, and a `50%` circular avatar; nine spacing tokens climbing from 4px to a 90px section band; and 17 component tokens covering buttons, the green hero band, the white iPhone mockup surface, the status-progress bar, money-display rows, FAQ items, and the footer link grid. Every value is quoted as an exact hex, pixel, or weight number.

    A working React or Next.js developer drops the file into Claude, Cursor, or GitHub Copilot and the agent reproduces Cash App's green-canvas rhythm — full-bleed Cash Green hero, black-pill nav CTAs, Cash Sans weight-400 uniformity, iPhone-mockup white surface composited centre-band — rather than a generic neobank theme. Tokens map onto Tailwind config or CSS variables, and components reference each other by name. The system is worth studying for one disciplined choice that mirrors Linear's single-accent restraint: the brand voltage is too saturated to share the page with any secondary accent, so the system gives up the secondary accent entirely. Where most fintech brands hold their brand colour in reserve as a button fill, Cash App spends it all at once on the canvas — and then has nothing else to spend.
  related:
    - href: "/design"
      title: "Browse all design systems"
      description: "The full directory of DESIGN.md files on shadcn.io, with live mockups for each."
    - href: "https://cash.app"
      title: "Cash App — official site"
      description: "The Block-owned consumer fintech's marketing canvas — source of every hex, font, and radius in this spec."
    - href: "https://github.com/google-labs-code/design.md"
      title: "The DESIGN.md specification"
      description: "Google Labs' open spec for machine-readable design system files — the format this page is built on."
  questions:
    - id: "primary-color"
      title: "What is Cash App's primary brand color and how is it used?"
      answer: "Cash Green — `#00e013`, a fully-saturated digital green that reads as bright traffic-light green rather than fintech mint. The structural rule: Cash Green is the canvas, not the CTA. It fills the full-bleed hero band as a background colour, never as a button fill. The primary button is a black pill at `#000000` with white text and a `999px` radius. The secondary button is a white-outlined pill on the green canvas. Cash Green also fills the small wordmark rounded-square at the top-left and accents the iPhone status icons inside the mockup, but it never carries text and never fills a CTA."
    - id: "typography"
      title: "What typography does Cash App use, and what should I use if Cash Sans isn't available?"
      answer: "Cash App runs Cash Sans across every tier at the single weight 400 — no thin display weight, no bold body weight. The hero renders at 56px with `lineHeight: 53.2px` and `letterSpacing: -1.68px`, h2 at 40px with `-1.2px`, lead paragraph at 25px with `-0.75px`, body at 18px with `-0.54px`, and the button label at 12px with `-0.24px`. The fallback stack ships `Helvetica Neue, helvetica, sans-serif`. When Cash Sans is unavailable, Inter at weight 400 with matching negative letter-spacing renders the closest open-source silhouette; General Sans at weight 400 also reads correctly. Hold the weight ladder at 400 — pushing display to 600+ collapses the brand's confidence-through-restraint signature."
    - id: "canvas-as-voltage"
      title: "Why is the green a canvas instead of a button?"
      answer: "Cash Green at `#00e013` sits at `oklch(0.79 0.26 143)` — a chroma value high enough that any text rendered on top must be either pure black or pure white to pass WCAG AA. A button fill at that saturation would over-power every adjacent UI element. By spending the voltage on the full-bleed canvas instead, the brand achieves maximum visual recognition on first paint and then steps the page down to a strict black-on-white product surface (the iPhone mockup) where actual money displays read. The trade-off the system accepts: no room for a secondary accent. The page runs on four colours total — green, black, white, gray — and the green-to-white surface transition is the brand's sole depth move."
    - id: "pill-geometry"
      title: "What is the shape language and what does the `100px` radius do?"
      answer: "Three radius tiers carry the system. Buttons are pills at `999px` — the customary infinity-radius shortcut. Mid-size surfaces (the iPhone mockup's status card, the savings card, the borrow card composited inside the phone frame) sit at `100px` — an unusually large fixed-pixel radius for content cards, which gives the inner UI a soft, oversized-pill silhouette rather than the typical 8-12px rectangle. Profile avatars and circular icons use `50%`. There is no sharp-cornered geometry in the system at all — the smallest radius value the brand ships is `100px` on a content card."
    - id: "use-in-project"
      title: "Can I use this DESIGN.md to build my own React fintech app?"
      answer: "Yes — the file is structured to feed into Claude, Cursor, or any AI coding tool that reads structured design tokens. The agent will reproduce Cash App's green-canvas hero, black-pill CTA nav, Cash Sans weight-400 uniformity, and oversized `100px` content-card radius rather than a generic consumer-banking theme. You can also reference the tokens directly: every colour is a quoted hex, every radius and padding is a quoted pixel string, and the 17 component definitions reference each other by token name so `button-primary-pill` resolves through `{colors.ink}` over `{colors.canvas-green}` to the actual black-on-green CTA pairing the brand ships."
    - id: "known-gaps"
      title: "What's missing from this DESIGN.md spec?"
      answer: "A few items, documented in the Known Gaps section: pressed and focus states are not captured — only the base CTA pairing is documented. The Cash App Pay merchant-surface palette and the Cash App Card physical-card art tokens are out of scope; only the public marketing canvas at cash.app is in this spec. The iPhone mockup's inner-UI gradient bars (the green status fill, the Bitcoin chart sparkline) appear as raster art rather than CSS-rendered colour and are not captured as design tokens. The logged-in app surfaces (Pay, Cash Card, Bitcoin, Stocks, Savings, Borrow) and the legal-footer regulatory text block are described in prose but not enumerated."

colors:
  primary: "#00e013"
  canvas-green: "#00e013"
  canvas-light: "#ffffff"
  surface-white: "#ffffff"
  surface-app: "#f7f7f7"
  surface-card: "#ffffff"
  ink: "#000000"
  ink-mute: "#999999"
  ink-disabled: "#bfbfbf"
  on-ink: "#ffffff"
  on-green: "#000000"
  on-green-soft: "#ffffff"
  hairline: "#e5e5e5"
  hairline-mute: "#cccccc"
  divider-soft: "#f0f0f0"
  link: "#0000ee"
  brand-mark: "#00e013"
  scrim: "#000000"

typography:
  display-xxl:
    fontFamily: "\"Cash Sans\", \"Helvetica Neue\", helvetica, sans-serif"
    fontSize: 56px
    fontWeight: 400
    lineHeight: 53.2px
    letterSpacing: "-1.68px"
  display-xl:
    fontFamily: "\"Cash Sans\", \"Helvetica Neue\", helvetica, sans-serif"
    fontSize: 40px
    fontWeight: 400
    lineHeight: 44px
    letterSpacing: "-1.2px"
  display-md:
    fontFamily: "\"Cash Sans\", \"Helvetica Neue\", helvetica, sans-serif"
    fontSize: 25px
    fontWeight: 400
    lineHeight: 29.8px
    letterSpacing: "-0.75px"
  body-lg:
    fontFamily: "\"Cash Sans\", \"Helvetica Neue\", helvetica, sans-serif"
    fontSize: 20px
    fontWeight: 400
    lineHeight: 28.3px
    letterSpacing: "-0.6px"
  body-md:
    fontFamily: "\"Cash Sans\", \"Helvetica Neue\", helvetica, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 25.2px
    letterSpacing: "-0.54px"
  body-bold:
    fontFamily: "\"Cash Sans\", \"Helvetica Neue\", helvetica, sans-serif"
    fontSize: 20px
    fontWeight: 700
    lineHeight: 28.3px
    letterSpacing: "-0.6px"
  caption:
    fontFamily: "\"Cash Sans\", \"Helvetica Neue\", helvetica, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 14px
    letterSpacing: "-0.28px"
  label:
    fontFamily: "\"Cash Sans\", \"Helvetica Neue\", helvetica, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 12px
    letterSpacing: "-0.24px"
  micro:
    fontFamily: "\"Cash Sans\", \"Helvetica Neue\", helvetica, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 14.4px
    letterSpacing: "-0.24px"
  superscript:
    fontFamily: "\"Cash Sans\", \"Helvetica Neue\", helvetica, sans-serif"
    fontSize: 9px
    fontWeight: 400
    lineHeight: 12.6px
    letterSpacing: "-0.54px"

rounded:
  none: "0px"
  card-mid: "100px"
  pill: "999px"
  pill-alt: "100px"
  circle: "50%"

spacing:
  xs: "4px"
  sm: "8px"
  md: "20px"
  lg: "24px"
  xl: "32px"
  xxl: "40px"
  band-y: "90px"
  band-x: "20px"
  cta-x: "20px"

components:
  button-primary-pill:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0px 20px"
    height: "46px"
    border: "0"
  button-primary-pill-on-green:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0px 20px"
    height: "46px"
    border: "0"
  button-secondary-pill-on-green:
    backgroundColor: "{colors.canvas-green}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0px 20px"
    height: "46px"
    border: "1px {colors.on-green-soft}"
  button-cta-arrow:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0px 20px"
    height: "46px"
    border: "0"
  hero-band-green:
    backgroundColor: "{colors.canvas-green}"
    textColor: "{colors.ink}"
    typography: "{typography.display-xxl}"
    rounded: "{rounded.none}"
    padding: "90px 20px"
  hero-headline:
    backgroundColor: "{colors.canvas-green}"
    textColor: "{colors.ink}"
    typography: "{typography.display-xxl}"
    rounded: "{rounded.none}"
    padding: "0"
  hero-supporting-copy:
    backgroundColor: "{colors.canvas-green}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "0"
  iphone-mockup-surface:
    backgroundColor: "{colors.surface-app}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.pill-alt}"
    padding: "32px 24px"
  card-status-row:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.pill-alt}"
    padding: "24px"
  card-money-display:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
    rounded: "{rounded.pill-alt}"
    padding: "24px"
  progress-bar-green:
    backgroundColor: "{colors.canvas-green}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0"
    height: "8px"
  brand-mark-square:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas-green}"
    typography: "{typography.label}"
    rounded: "{rounded.pill-alt}"
    padding: "8px"
    height: "40px"
  top-nav:
    backgroundColor: "{colors.canvas-green}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "20px 32px"
  section-heading:
    backgroundColor: "{colors.canvas-green}"
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
    rounded: "{rounded.none}"
    padding: "0"
  body-paragraph:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "0"
  footer-row:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink-mute}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
    padding: "40px 32px"
  legal-superscript:
    backgroundColor: "{colors.canvas-green}"
    textColor: "{colors.ink}"
    typography: "{typography.superscript}"
    rounded: "{rounded.none}"
    padding: "0"
---

## Overview

Cash App's marketing canvas opens with a single design decision: the brand voltage is the canvas. A fully-saturated Cash Green `#00e013` — `oklch(0.79 0.26 143)`, a chroma value high enough that only pure black or pure white can be set on top — floods the entire above-the-fold band, edge to edge, ceiling to floor. The hero headline ("The way money should work") sits at 56px in Cash Sans weight 400 with `letterSpacing: -1.68px` on the green canvas in pure black. An iPhone mockup floats centre-page on a white-ish app surface `#f7f7f7`, displaying composited money rows ("Savings $980.00", "Borrow $150.00 available", "Bitcoin $8.05"). The only two buttons on the page — "Sign up" outlined in white and "Log in" filled black — sit pinned to the top-right nav.

The colour system has two structural backgrounds and one ink stack. **Canvas Green** (`{colors.canvas-green}` — #00e013) is the brand voltage, painted as a band rather than reserved for a CTA. **Canvas Light** (`{colors.canvas-light}` — #ffffff) is the alternate body band beneath the hero. **Ink** (`{colors.ink}` — #000000, pure black) does every text job — hero, h2, body, button label, footer. **Ink Mute** (`{colors.ink-mute}` — #999999) carries helper copy like "$20 to goal" inside the iPhone mockup. There is no fifth role and no secondary accent.

Typography is **Cash Sans** at the single weight 400 across every tier — a hero at 56px, h2 at 40px, lead paragraph at 25px, body at 18px, button label at 12px — with a negative-tracking ladder from `-1.68px` down to `-0.24px`. **Light-weight as no-weight**: Where Stripe holds display at weight 300 to signal editorial confidence and Monzo pins every heading at weight 800 to signal warmth, Cash App holds every tier at weight 400 — the absence of weight variation is the brand's confidence signal. The page never gets visually heavier; it gets visually larger.

**Key Characteristics:**
- Canvas-as-voltage: Cash Green `#00e013` fills the full-bleed hero band as background, never as a CTA fill.
- Single-weight Cash Sans across every tier from 56px hero down to 12px label — no bold, no thin, no italic.
- Black-pill CTA on green canvas: `#000000` background, white text, `999px` radius, `0px 20px` padding, 46px height.
- White-outlined secondary pill: same geometry, transparent fill on green, 1px white border, black text.
- Oversized `100px` content-card radius — every mid-size surface inside the iPhone mockup carries this soft pill silhouette.
- Negative-tracking ladder: `-1.68px` at 56px, `-1.20px` at 40px, `-0.75px` at 25px, `-0.54px` at 18px, `-0.24px` at 12px.
- Zero secondary accent — black, white, green, gray do every job; the brand has spent its voltage on the canvas and held nothing back.

## Colors

> **Source pages:** home (`/`).

### Brand & Canvas
- **Cash Green** (`{colors.canvas-green}` — #00e013) — frequency 2. Used as bg (2). The brand voltage, painted as a full-bleed canvas band. Carries the hero and the wordmark fill.
- **Brand Mark Green** (`{colors.brand-mark}` — #00e013) — alias of Cash Green used inside the top-left rounded-square wordmark on black.

### Ink
- **Black** (`{colors.ink}` — #000000) — frequency 439. Used as text (220) and border (217). The universal ink for every type tier on green or white surfaces, and the fill of every primary CTA pill.
- **Ink Mute** (`{colors.ink-mute}` — #999999) — frequency 58. Used as text (29) and border (29). Helper copy and disabled chrome inside the iPhone mockup ("$20 to goal", "owed").
- **Ink Disabled** (`{colors.ink-disabled}` — #bfbfbf): A neutral step between `ink-mute` and `hairline` reserved for disabled chip outlines and inactive footer dots — observed in the iPhone mockup outline strokes.

### On-Surface
- **On Ink** (`{colors.on-ink}` — #ffffff): Text on black pills and dark surfaces.
- **On Green** (`{colors.on-green}` — #000000): Black text on the Cash Green canvas — the structural rule for every word inside the hero band.
- **On Green Soft** (`{colors.on-green-soft}` — #ffffff): White text and white pill outline on Cash Green — used on the secondary nav button.

### Surface
- **Canvas Light** (`{colors.canvas-light}` — #ffffff) — frequency 8. Used as bg (4). Default body band beneath the green hero.
- **Surface White** (`{colors.surface-white}` — #ffffff): Alias of canvas-light for CTA fills on green ("Get started" pill on white-ish surface).
- **Surface App** (`{colors.surface-app}` — #f7f7f7): The off-white inside the iPhone mockup chrome that holds the composited money rows.
- **Surface Card** (`{colors.surface-card}` — #ffffff): The fill of every mid-size content card composited inside the iPhone mockup.

### Hairline
- **Hairline** (`{colors.hairline}` — #e5e5e5): 1px outlines on the iPhone mockup status rows.
- **Hairline Mute** (`{colors.hairline-mute}` — #cccccc): A slightly darker hairline on disabled chip outlines.
- **Divider Soft** (`{colors.divider-soft}` — #f0f0f0): The lightest divider used between footer link groups on the white band.

### Link & Scrim
- **Link** (`{colors.link}` — #0000ee) — frequency 6. Used as text (3) and border (3). Default browser-blue used on legal footer links — the brand keeps the user-agent link colour unstyled rather than overriding it to black or green.
- **Scrim** (`{colors.scrim}` — #000000): Pure black overlay used as the modal backdrop and the mobile menu scrim.

## Typography

### Font Family

The display and UI tier is **Cash Sans** (proprietary) at the single weight 400. The variable font is loaded with no `font-feature-settings` modifications observed in the captured CSS. The fallback stack is `"Cash Sans", "Helvetica Neue", helvetica, sans-serif`.

When Cash Sans is unavailable, **Inter** (open-source via Google Fonts) at weight 400 with matching negative `letter-spacing` from `-1.68px` at 56px down to `-0.24px` at 12px renders the closest open-source approximation. **General Sans** at weight 400 also reads correctly. Avoid Helvetica or system-ui defaults — they round the letterforms wider than the brand needs.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xxl}` | 56px | 400 | 53.2px | -1.68px | Hero headline |
| `{typography.display-xl}` | 40px | 400 | 44px | -1.20px | Section h2 / h3 |
| `{typography.display-md}` | 25px | 400 | 29.8px | -0.75px | Lead paragraph |
| `{typography.body-lg}` | 20px | 400 | 28.3px | -0.60px | Long-form body |
| `{typography.body-md}` | 18px | 400 | 25.2px | -0.54px | Default UI body |
| `{typography.body-bold}` | 20px | 700 | 28.3px | -0.60px | Strong emphasis inline |
| `{typography.caption}` | 14px | 400 | 14px | -0.28px | Nav link / inline caption |
| `{typography.label}` | 12px | 500 | 12px | -0.24px | Button label |
| `{typography.micro}` | 12px | 400 | 14.4px | -0.24px | Footer link / legal copy |
| `{typography.superscript}` | 9px | 400 | 12.6px | -0.54px | Hero superscript legal mark |

### Principles
- **Single weight is the brand.** Display tiers and body tiers both render at weight 400. The one weight-700 token is an inline-bold variant used inside paragraph copy for emphasis — it is not a display weight.
- **Negative tracking on every tier.** Every typography token carries negative `letter-spacing` from `-1.68px` at 56px down to `-0.24px` at 12px. The tightened tracking is the brand's typographic signature.
- **`lineHeight` tighter than display.** Hero `lineHeight: 53.2px` is shorter than the `fontSize: 56px` — a deliberate over-stack that pulls the two display lines tighter than the cap height suggests.

### Note on Font Substitutes
Cash Sans is proprietary. Use **Inter** (open-source via Google Fonts) at weight 400 with `letter-spacing: -1.68px` on the 56px display tier as the closest analogue. Avoid pushing display weight above 400 — at 500 the brand's confidence-through-restraint signature collapses, and at 700+ the page reads as a generic challenger-bank theme.

## Layout

### Spacing System
- **Base unit**: 4px (with 8 / 20 / 24 / 32 / 40 sub-tokens for finer work).
- **Tokens**: `{spacing.xs}` 4px · `{spacing.sm}` 8px · `{spacing.md}` 20px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 40px · `{spacing.band-y}` 90px · `{spacing.band-x}` 20px · `{spacing.cta-x}` 20px.
- **Section padding**: `90px 0px` vertical on full-bleed bands; `40px 32px` on footer rows; `0px 20px` on horizontal CTA padding.
- **Card internal padding**: 32px 24px on the iPhone mockup chrome; 24px on the inner money-display rows.

### Grid & Container
- Marketing page renders edge-to-edge: the green hero band fills the viewport width with no inner container. Content centres at roughly 1200px with the iPhone mockup pinned centre-band.
- Two-column hero layout: headline left, supporting copy + CTA right, iPhone mockup pinned centre.
- Footer collapses to a single-column link grid on mobile.

### Whitespace Philosophy
Vertical rhythm is built on the 90px section-band stride. Each full-bleed band gets `90px 0px` padding top and bottom; nothing inside the band tightens below 20px. The brand does not soften the boundary between the green hero band and the white body band — the surface transition is a hard edge.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 | Flat | Default surface — green canvas, white body band |
| 1 | iPhone mockup chrome | Composited screenshot of a real iPhone over the canvas — the brand's depth medium |
| 2 | Inner content card | Mid-size cards inside the iPhone mockup at `100px` radius — the only stacked surface |

### Decorative Depth
The iPhone mockup IS the depth system. The brand does not use CSS `box-shadow` on marketing surfaces — depth is supplied by the device-frame mockup composited over the green canvas, with the device's own bezel and inner-screen surface doing the elevation work. Literal CSS shadows would compete with the canvas voltage; the brand omits them entirely.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Full-bleed bands, plain prose |
| `{rounded.pill-alt}` | 100px | Mid-size content cards inside the iPhone mockup, the brand wordmark square |
| `{rounded.card-mid}` | 100px | Alias for content cards |
| `{rounded.pill}` | 999px | All buttons, progress bar fills |
| `{rounded.circle}` | 50% | Avatars, circular Bitcoin icon, hamburger menu button |

### Photography Geometry
The brand uses a **single composited iPhone mockup** more than photography. The device frame is a real iPhone, rendered at roughly 720x1200px centre-band, with its inner screen displaying a stack of money-display rows. There is no other photography on the home page — no customer logos, no team photos, no lifestyle shots.

## Components

### Buttons

**`button-primary-pill`** — the dominant CTA system-wide.
- Background `{colors.ink}` (#000000), text `{colors.on-ink}` (#ffffff), type `{typography.label}` (12px / 500 / -0.24px), padding `0px 20px`, height 46px, rounded `{rounded.pill}` 999px.

**`button-primary-pill-on-green`** — identical geometry, the same black pill rendered on the green canvas. The "Log in" CTA in the top-right nav.

**`button-secondary-pill-on-green`** — outline-style alternative on green.
- Background `{colors.canvas-green}` (transparent over green), text `{colors.ink}` (#000000), 1px stroke `{colors.on-green-soft}` (#ffffff) border, same pill geometry. The "Sign up" CTA in the top-right nav.

**`button-cta-arrow`** — white pill with an inline arrow used on green.
- Background `{colors.surface-white}` (#ffffff), text `{colors.ink}` (#000000), same pill geometry, with a small black arrow glyph appended after the label. The "Get started" CTA inside the green hero.

### Hero & Bands

**`hero-band-green`** — the brand's signature band.
- Background `{colors.canvas-green}` (#00e013), text `{colors.ink}`, padding `90px 20px`, no radius. Carries the hero headline left, supporting copy right, and the iPhone mockup centre.

**`hero-headline`** — the 56px headline on green.
- Text `{colors.ink}` (#000000) rendered in `{typography.display-xxl}` (56 / 400 / -1.68px), `lineHeight: 53.2px`. Set on the Cash Green canvas with no extra background fill.

**`hero-supporting-copy`** — the right-rail paragraph on green.
- Text `{colors.ink}` rendered in `{typography.body-md}` (18 / 400 / -0.54px). One paragraph, two-three lines, no decoration.

### iPhone Mockup

**`iphone-mockup-surface`** — the composited device frame's inner screen.
- Background `{colors.surface-app}` (#f7f7f7), text `{colors.ink}`, padding `32px 24px`, rounded `{rounded.pill-alt}` 100px. Holds a vertical stack of money-display rows.

**`card-status-row`** — the green-status progress row inside the mockup.
- Background `{colors.surface-card}` (#ffffff), text `{colors.ink}`, padding `24px`, rounded `{rounded.pill-alt}` 100px. Contains a label, an amount-to-goal helper in `{colors.ink-mute}`, and a `progress-bar-green` fill.

**`card-money-display`** — the savings / borrow / bitcoin money rows.
- Background `{colors.surface-card}` (#ffffff), text `{colors.ink}` (#000000), type `{typography.display-xl}` (40px / 400 / -1.2px) for the amount, padding `24px`, rounded `{rounded.pill-alt}` 100px. A title sits above the amount in `{typography.body-md}`; a helper sits below in `{typography.caption}` and `{colors.ink-mute}`.

**`progress-bar-green`** — the status fill bar inside `card-status-row`.
- Background `{colors.canvas-green}` (#00e013), height 8px, rounded `{rounded.pill}` 999px. The only place Cash Green appears inside the iPhone mockup surface.

### Brand Mark & Nav

**`brand-mark-square`** — the rounded-square wordmark at the top-left.
- Background `{colors.ink}` (#000000), text `{colors.canvas-green}` (#00e013) — the green wordmark glyph rendered inside a black square at `{rounded.pill-alt}` 100px. The only place the green appears as a non-canvas fill.

**`top-nav`** — the top navigation bar on green.
- Background `{colors.canvas-green}` (#00e013), text `{colors.ink}`, padding `20px 32px`, no radius. Holds the brand mark left, sign-up + log-in pills right, and a circular hamburger button at `{rounded.circle}` 50%.

### Body & Footer

**`section-heading`** — the h2 rendered on either band.
- Text `{colors.ink}` rendered in `{typography.display-xl}` (40px / 400 / -1.2px). Used as section openers ("Earn, save, and do more with Cash App Green").

**`body-paragraph`** — default prose on the white body band.
- Background `{colors.canvas-light}` (#ffffff), text `{colors.ink}`, type `{typography.body-md}` (18px / 400 / -0.54px), no radius.

**`footer-row`** — the site-wide footer.
- Background `{colors.canvas-light}` (#ffffff), text `{colors.ink-mute}` (#999999), type `{typography.caption}` (14px / 400 / -0.28px), padding `40px 32px`. Holds a multi-column link grid, app-store badges, and a legal regulatory text block.

**`legal-superscript`** — the 9px legal-mark superscript next to hero claims.
- Text `{colors.ink}` rendered in `{typography.superscript}` (9px / 400 / -0.54px). Inline next to numeric or claim copy as a footnote reference.

## Do's and Don'ts

### Do
- Paint Cash Green `#00e013` as the full-bleed canvas of the hero band, not as a button fill.
- Hold every type tier at Cash Sans weight 400; reserve weight 500 for the 12px button label and weight 700 only for inline `<b>` emphasis at 20px.
- Render every CTA as a `999px` pill at 46px height with `0px 20px` padding — the brand never ships a rounded-rectangle button.
- Use the oversized `100px` radius on every mid-size content card composited inside the iPhone mockup.
- Apply negative `letter-spacing` on every tier — `-1.68px` at 56px scaling down to `-0.24px` at 12px.
- Pin black text on Cash Green and white text on black `{colors.ink}` — those two pairings carry every type role.

### Don't
- Don't use `#00e013` (`{colors.canvas-green}`) as a button fill on a white surface — at `oklch(0.79 0.26 143)` the chroma is high enough that no text colour reads cleanly at button scale. The brand reserves the green for the canvas at 2-count frequency; promoting it to a button breaks the canvas-as-voltage rule.
- Don't introduce a third accent colour for highlights or success states — the system runs on green / black / white / gray and has no fifth role. A purple or red accent would compete with the canvas voltage.
- Don't render display tiers at weight 600+ — at 500 the brand's confidence-through-restraint signature starts to read as generic, and at 700+ the page becomes a different challenger-bank entirely.
- Don't drop the negative `letter-spacing` on body sizes — even the 12px label ships at `-0.24px`. Default tracking reads loose against the tight display ladder.
- Don't replace the `100px` content-card radius with a customary 8-12px rectangle. The oversized fixed-pixel radius is the brand's mid-card silhouette; rectangles read as foreign.
- Don't apply CSS `box-shadow` to marketing surfaces — the iPhone mockup is the depth system, and literal shadows would compete with the canvas voltage at saturation `0.26`.
- Don't override the default-browser link colour `#0000ee` on the legal footer — the brand intentionally keeps user-agent link styling for the regulatory block.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Wide | ≥ 1440px | Hero band edge-to-edge; iPhone mockup at full scale centre-band |
| Desktop | 1024–1440px | Default two-column hero with iPhone mockup centred |
| Tablet | 768–1023px | Hero collapses to single column; iPhone mockup pins below headline |
| Mobile | < 768px | Hero drops 56 → 36px; CTA pills stack vertically; hamburger replaces nav |

### Touch Targets
- Pill buttons hit 46x46px minimum via the height token. On smaller screens, buttons retain the 46px height to maintain WCAG AAA.
- Hamburger menu and circular icons stay at 40x40px minimum.

### Collapsing Strategy
- Display tier stair-steps 56 → 40 → 32 → 28px through the breakpoints.
- Hero layout collapses two-column → single-column, with the iPhone mockup pinning below the headline + supporting copy.
- The green canvas stays full-bleed at every breakpoint — the brand does not introduce a side gutter on mobile.

### Image Behavior
The iPhone mockup uses `srcset` with art-direction crops at major breakpoints. Mobile crops focus on the centre of the device screen showing the savings row; desktop crops show the full multi-row composition.

## Known Gaps

- **Hover and pressed states:** only the base CTA pairing (black pill on green / white pill on green) is documented. Hover, pressed, and focus specs are not captured from the marketing surface.
- **Cash App Pay merchant palette:** the merchant-checkout surface and the Cash App Card physical-card art tokens live on separate surfaces and are not part of this marketing-system spec.
- **Logged-in app:** Pay, Cash Card, Bitcoin, Stocks, Savings, and Borrow surfaces are out of scope; only the public marketing canvas at cash.app is captured.
- **iPhone mockup inner-UI raster art:** the green-status progress fill, the Bitcoin sparkline, and the circular Bitcoin glyph appear as composited raster art and are not enumerated as design tokens.
- **Motion specs:** the hero may carry a subtle parallax or zoom on scroll; precise easing and duration tokens were not captured.
- **Mobile menu and modal:** the hamburger-triggered overlay and any in-page modals are described in prose but not enumerated as token sets.
