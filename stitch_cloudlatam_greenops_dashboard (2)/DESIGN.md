# Design System Specification: The Fluid Architect

## 1. Overview & Creative North Star
**The Creative North Star: "Precision Atmosphere"**

This design system moves beyond the rigid, boxy constraints of traditional enterprise dashboards. Instead of a "spreadsheet in a browser," we are building a **Fluid Architect**—an environment that feels like a high-end command center. We achieve this through "Precision Atmosphere": combining the mathematical rigor of cloud data with the editorial elegance of a premium publication.

We break the "template" look by rejecting the grid as a cage. By utilizing **intentional asymmetry**, **tonal layering**, and **expansive whitespace**, we transform high-density monitoring into a breathable, intuitive experience. The goal is to make the user feel in total control of a vast, complex ecosystem without ever feeling overwhelmed by it.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule

Our palette is rooted in the "Deep Cloud Blue," but its application must be sophisticated. We do not use color simply to decorate; we use it to define the architecture of information.

### The "No-Line" Rule
**Borders are a design failure of the past.** In this system, 1px solid borders for sectioning are strictly prohibited. We define boundaries through:
*   **Background Shifts:** Transitioning from `surface` to `surface-container-low`.
*   **Tonal Transitions:** Using the hierarchy of surface tiers to suggest containment.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of frosted glass.
*   **Base:** `surface` (#f7f9ff) for the main application background.
*   **Sub-sections:** Use `surface-container-low` to sit "into" the page.
*   **Interactive Cards:** Use `surface-container-lowest` (#ffffff) to "lift" the content toward the user.

### The "Glass & Gradient" Rule
To elevate the "Cloud" metaphor, use **Glassmorphism** for floating elements (like side-panels or hover-state modals). 
*   **Token:** `surface_container` at 80% opacity + `backdrop-blur: 20px`.
*   **Signature Textures:** Apply a subtle linear gradient to primary CTAs: `primary` (#005bbf) to `primary_container` (#1a73e8). This adds "soul" and a sense of light source to the interface.

---

## 3. Typography: The Editorial Data-Scale

We pair the authoritative, geometric curves of **Plus Jakarta Sans** (our Google Sans surrogate for display) with the high-utility, tabular performance of **Inter** (our Roboto surrogate for data).

*   **Display & Headlines (Plus Jakarta Sans):** These are your "Editorial Anchors." Use `display-lg` and `headline-md` with generous tracking-contracted (-0.02em) to create a premium, "set-in-stone" feel for sustainability metrics and cloud health titles.
*   **Data & Tables (Inter):** For the real-time monitoring feeds, use `body-sm` and `label-md`. Inter’s high x-height ensures that multi-language strings (German, Japanese, etc.) remain legible even at high densities.
*   **Hierarchy via Weight, Not Just Size:** Use `label-sm` in Semi-Bold for metadata to distinguish it from `body-md` without increasing font size, maintaining a clean visual density.

---

## 4. Elevation & Depth: Tonal Layering

We avoid traditional "Drop Shadows" which muddy the interface. We build depth through light and physics.

*   **The Layering Principle:** 
    *   **Level 0:** `surface` (The Floor)
    *   **Level 1:** `surface-container-low` (Recessed areas/Sidebar)
    *   **Level 2:** `surface-container-lowest` (Active Content Cards)
*   **Ambient Shadows:** If a floating state is required (e.g., a dragged dashboard widget), use a 32px blur, 0px offset shadow at 4% opacity using the `on-surface` color. It should feel like a soft glow of "missing light" rather than a dark stain.
*   **The "Ghost Border" Fallback:** For accessibility in high-density data tables, use the `outline-variant` token at **15% opacity**. It must be felt, not seen.

---

## 5. Components: Fluid Primitives

### Buttons & Chips
*   **Primary Action:** A gradient-filled container (`primary` to `primary_container`) with `xl` (0.75rem) roundedness. No border.
*   **Secondary Action:** `surface-container-high` background with `on-surface` text.
*   **Sustainability Chips:** Use `secondary_container` (#86f898) with `on_secondary_container` (#00722f). These should use the `full` (9999px) roundedness scale to look "organic" and distinct from data-chips.

### Input Fields & Search
*   **State:** Standard state uses `surface-container-highest` with no border.
*   **Focus:** Transition background to `surface_container_lowest` and add a 2px "Ghost Border" of `primary` at 40% opacity.

### Cards & Monitoring Lists
*   **Constraint:** Forbid divider lines between list items. 
*   **Solution:** Use 12px of vertical whitespace. On hover, the entire row should shift to `surface-container-high`.
*   **Sustainability Gauges:** Use the `secondary` (#006e2c) for "Optimal" and `tertiary` (#795900) for "Warning." Avoid the "Alert Orange" unless a system failure is imminent; the orange is an "Action" color, not a "Status" color.

### Custom Component: The "Pulse Monitor"
For real-time monitoring, use a `surface-container-lowest` card with a 2px semi-transparent `primary` left-border accent. This provides a clear "active" indicator without cluttering the horizontal plane.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use `surface-dim` for "off-page" navigation backgrounds to create a sense of focus on the main content area.
*   **Do** allow sustainability metrics to "bleed" across the grid occasionally. A large-scale metric can break the column line to emphasize importance.
*   **Do** utilize `on_surface_variant` for secondary labels to maintain a 7:1 contrast ratio while reducing visual noise.

### Don’t
*   **Don't** use 100% black (#000000). Use `on_surface` (#181c20) for all text to keep the "Editorial" softness.
*   **Don't** use standard `md` roundedness for everything. Mix `xl` for large containers and `sm` for small data-points to create visual rhythm.
*   **Don't** use dividers in tables. Rely on the `surface_container_low` stripe (Zebra striping) if density is extreme, but prefer whitespace.