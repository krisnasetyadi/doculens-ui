# Design System Specification: The Architectural Ledger

## 1. Overview & Creative North Star
This design system is built for the "Architectural Ledger"—a philosophy of precision, intellectual clarity, and spatial breathing room. In the context of an internal knowledge management workspace, our goal is to move away from the "generic SaaS dashboard" and toward a high-end editorial experience. 

We reject the rigid, boxy constraints of traditional B2B software. Instead, we embrace **Soft Minimalism**: a layout language defined by tonal depth, intentional asymmetry, and the complete removal of structural lines. This system prioritizes information density not by cramming data, but by organizing it through sophisticated layering that mimics the physical world of stacked vellum and frosted glass.

## 2. Color & Tonal Architecture
Our palette is a sophisticated interplay of deep blues (`primary`) and a versatile range of architectural grays (`surface` tiers).

### The "No-Line" Rule
**Explicit Instruction:** You are prohibited from using 1px solid borders to define sections, sidebars, or cards. 
Boundaries must be created through background color shifts. For example, a main content area using `surface` (#f7f9fb) should be separated from a sidebar using `surface-container-low` (#f0f4f7). The eye should perceive the edge through the change in tone, not a "drawn" line.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the `surface-container` tiers to define "importance" through depth:
- **Level 0 (Base):** `surface` (#f7f9fb) for the primary application background.
- **Level 1 (Sub-section):** `surface-container-low` (#f0f4f7) for navigation rails or secondary panels.
- **Level 2 (Active Element):** `surface-container-lowest` (#ffffff) for the primary content cards or document editors.
- **Level 3 (Interactive):** `surface-container-high` (#e1e9ee) for hovering states or temporary contextual panels.

### Glass & Gradient Signature
To elevate the experience from "flat" to "premium":
- **Glassmorphism:** Use semi-transparent `surface-container-lowest` with a 20px backdrop-blur for floating modals or command palettes.
- **Tonal Gradients:** For primary CTAs and hero-state accents, apply a subtle linear gradient from `primary` (#0053db) to `primary-dim` (#0048c1) at 135 degrees. This adds "soul" and weight that a flat hex code cannot achieve.

## 3. Typography: The Editorial Contrast
We utilize a dual-typeface strategy to signal the transition from "Executive Summary" to "Granular Data."

*   **Display & Headlines (Manrope):** This typeface is our "Authoritative Voice." It is geometric yet approachable. Use `display-lg` through `headline-sm` for page titles and section headers. Its wide stance creates an editorial feel that makes an internal tool feel like a premium publication.
*   **Body & UI (Inter):** Our "Utility Voice." Inter is optimized for the high-density reading required for knowledge management. Use `body-md` (#2a3439) for the majority of content.

**Hierarchy Note:** To achieve an editorial look, increase the tracking (letter-spacing) on `label-sm` and `label-md` by 0.02em and set them to uppercase when used as metadata tags.

## 4. Elevation & Depth
Depth in this system is achieved via **Tonal Layering**, not structural shadows.

*   **The Layering Principle:** Place a card using `surface-container-lowest` (#ffffff) on a background of `surface-container-low` (#f0f4f7). The natural contrast creates a "lift" that feels integrated into the environment.
*   **Ambient Shadows:** If a component *must* float (e.g., a dropdown or modal), use an ultra-diffused shadow. 
    *   *Token:* `box-shadow: 0 12px 32px -4px rgba(42, 52, 57, 0.08);`
    *   *Logic:* The shadow is a low-opacity tint of `on-surface` (#2a3439), mimicking natural light rather than a dark artificial blur.
*   **The "Ghost Border":** For accessibility in high-density data tables, use the `outline-variant` (#a9b4b9) but at **15% opacity**. It should be felt, not seen.

## 5. Components & Interface Patterns

### Buttons
- **Primary:** Gradient (`primary` to `primary-dim`), `DEFAULT` (8px) rounding, white `on-primary` text.
- **Secondary:** `secondary-container` (#d5e3fc) background with `on-secondary-container` (#455367) text. No border.
- **Tertiary:** Transparent background, `primary` text. Use for low-emphasis actions.

### Input Fields
- **Container:** Use `surface-container-highest` (#d9e4ea) for the input background with a `DEFAULT` (8px) radius.
- **State:** On focus, the background shifts to `surface-container-lowest` (#ffffff) with a 2px `primary` ghost-border (20% opacity).

### Cards & Knowledge Blocks
- **Construction:** No dividers. Use `xl` (24px) spacing between content blocks.
- **Selection:** When a card is selected, do not change the border. Change the background to `primary-container` (#dbe1ff).

### Chips (Data Tagging)
- **Selection Chips:** Use `secondary-fixed-dim` (#c7d5ed) with `on-secondary-fixed` (#324053).
- **Radius:** Always use `full` (9999px) for chips to contrast against the `DEFAULT` (8px) corners of the primary UI.

### Navigation Rail (Asymmetric Layout)
The main navigation should be a slim, vertical rail using `surface-dim` (#cfdce3) to anchor the left side of the screen, creating a strong vertical axis that allows the rest of the content to "breathe" horizontally.

## 6. Do’s and Don’ts

### Do:
- **Do** use negative space as a functional tool to group related knowledge items.
- **Do** use `surface-tint` sparingly to highlight active navigation states.
- **Do** lean into the `Manrope` typeface for large-scale typography to create a sense of prestige.
- **Do** use `surface-container-lowest` for the main canvas where the "work" happens (e.g., the document editor).

### Don't:
- **Don't** use a 1px solid border to separate the header from the body. Use a subtle shadow or a background shift to `surface-container-low`.
- **Don't** use pure black (#000000) for text. Always use `on-surface` (#2a3439) for readability.
- **Don't** use more than two levels of nested containers. If you need a third level, use a "Ghost Border" instead of another background shift to avoid visual "mud."
- **Don't** use high-contrast shadows. If the shadow is clearly visible, it's too dark.