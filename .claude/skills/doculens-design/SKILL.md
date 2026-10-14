---
name: doculens-design
description: DocuLens (chat-ui) visual design language — color/type/shadow/motif tokens extracted from the app's own most-cohesive screens (landing page, workspace Home/sidebar). Use whenever building or restyling a page, dialog, or component in this repo, so it reads as DocuLens rather than generic shadcn defaults. Triggers on tasks involving new UI, page/dialog restyling, or "make this consistent with the rest of the app".
metadata:
  scope: chat-ui
  version: "1.0.0"
  source: "extracted 2026-08 from app/page.tsx and app/(workspace)/home,layout.tsx"
---

# DocuLens Design Language

This is not a generic design-system checklist — it's the actual token set already in production in this codebase, extracted from the screens that read as most intentional (`app/page.tsx`, `app/(workspace)/home/page.tsx`, `app/(workspace)/layout.tsx`). When you touch UI in `chat-ui`, pull from here instead of reaching for shadcn's raw defaults. Raw shadcn (`<Card>`, default `<Button>`, plain `<DialogTitle>`) is the *base*, not the finished look — every screen that feels "on-brand" adds the layer described below on top of it.

## Color

Tokens live in `app/globals.css`, already wired through Tailwind (`bg-primary`, `text-primary`, `bg-card`, `border-border`, `text-muted-foreground`, etc.) — use those, never hardcode a hex for anything that should react to light/dark mode.

- `--primary`: light `#3b6ff0`, dark `#4a7cff` — the one accent color in the app. There is no secondary accent color; don't introduce one.
- Custom colored shadows throughout the codebase are hardcoded to the **dark-mode** primary as `rgba(74,124,255, alpha)`. This is the established convention (not fully theme-reactive, but consistent) — match it, don't invent a different rgba. It is for decorative rings only, never for a button (see Shadow & elevation).
- `--radius: 0.5rem` is the base of the corner scale; which corner an element gets is in the Radius table below.

## Typography

Two families, loaded in `app/layout.tsx` via Google Fonts, mapped by role — never by "what looks good here", always by role:

- **Manrope (`font-['Manrope']`), weight 700–800 (`font-bold`/`font-extrabold`)** — every heading, every eyebrow/label, every button label (set once in the shared button), every stat/number. This is the family that carries the brand's voice.
- **Inter (`font-['Inter']`)** — all body copy, descriptions, helper text, table/list content. It's also the CSS `--font-sans` default, so plain text inherits it for free; only add the explicit class when you want to be unambiguous next to Manrope siblings.
- Eyebrow label pattern (used above every major section heading): `text-[11px] font-['Manrope'] font-bold tracking-[0.2em] uppercase text-primary`.
- Wordmark lockup pattern (sidebar, landing header, auth layout — keep this exact shape, don't redraw it):
  ```
  <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_0_4px_rgba(74,124,255,0.15)]">
    <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
  </div>
  <div>
    <h1 className="font-['Manrope'] text-base font-extrabold text-foreground leading-none">DocuLens</h1>
    <p className="font-['Manrope'] text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground/60 mt-0.5">Enterprise Intelligence</p>
  </div>
  ```

## Radius

One corner standard, taken from the shared (shadcn) components. Each kind of element has one corner everywhere:

| Area | Corner | Applies to |
|---|---|---|
| Controls | 6px (`rounded-md`) | Buttons in every size, icon-only buttons, text fields, text areas, selects, badges, tabs, tooltips, popovers, dropdown menus, loading skeletons |
| Items inside a menu | 4px (`rounded-sm`) | Options in a dropdown, select or command list; checkboxes |
| Overlays and notices | 8px (`rounded-lg`) | Dialogs, confirmation dialogs, inline alerts, clickable list rows |
| Surfaces | 12px (`rounded-xl`) | Cards, panels, toasts, empty-state icon wells |
| Pills | fully rounded (`rounded-full`) | Avatars, switches, progress bars, chips, status dots |

- A screen does not set a corner size on a shared component. The corner comes from the component itself, so a button next to a text field always has the same corner as the field.
- A container that is not a shared component (list row, panel, well) uses the corner of its area in the table.
- No corner larger than 12px is used in the workspace, auth or payment pages, except fully rounded pills. `rounded-3xl` stays only for the landing page's glass CTA card.

## Shadow & elevation

Pick by what the element is:

1. **Resting card** (Card, form panel): the neutral card shadow (`shadow-xs`), not colored.
2. **Buttons**: no coloured glow or shadow, and no hover lift. The main action is recognised by its solid primary colour alone; hover only darkens it slightly.
3. **Ambient glow** (decorative, page/section background): blurred primary-tinted circles, e.g. `w-64 h-64 rounded-full bg-primary/[0.07] blur-[90px] pointer-events-none`. Always `pointer-events-none`, always `absolute`/`fixed` and out of the content flow. Used to keep otherwise-empty backgrounds (auth pages, hero sections) from feeling bare — not decoration for decoration's sake, so skip it on already-dense screens (tables, lists).

Destructive actions are plain `variant="destructive"`: no glow either. The button label font (Manrope bold) is set once in the shared button, not per screen.

## Icons

Two icon sets coexist by role (this is an imperfect but real convention — converge new code toward it rather than picking whichever import is already at hand):
- **Material Symbols Outlined** (`<span className="material-symbols-outlined">`, add `style={{ fontVariationSettings: "'FILL' 1" }}` when it should read as "active"/filled) — navigation, brand/hero moments, source-type icons in chips.
- **lucide-react** — dialogs, data tables, form controls, toasts, anything utility-feeling (Loader2, Trash2, Eye/EyeOff, Check, AlertCircle).
Don't use raw emoji as UI icons (🎯💡 etc.) — pick a lucide icon instead; emoji don't match either icon set and render inconsistently across platforms.

## Structural motifs

- **Eyebrow → heading → subtext**, centered, above any major section (see landing page's Features/Pricing/CTA sections). Eyebrow uses the label pattern above; heading is Manrope extrabold, often two lines with a `<br />`; subtext is Inter, muted.
- **Empty state**: icon in a `p-5 rounded-xl bg-muted/40 border border-border/50` well, bold Manrope heading ("No data yet"), Inter subtext, and the CTA button *inside* the same centered block — never split the CTA off into a header bar that's disconnected from the empty illustration. Reuse the shared `EmptyState` component in `sources-panel.tsx` rather than hand-rolling a near-duplicate.
- **Pill/badge with pulse dot** (`<span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />` next to short uppercase text) — reserve for things that are genuinely live/status-like ("Now in Beta", a real-time indicator). Don't use the pulse animation on a static label like a role badge — it implies activity that isn't there.
- Auth pages (`app/(auth)/*`) carry the wordmark lockup + ambient orbs from `app/(auth)/layout.tsx` — don't strip that when touching login/register, and don't add a *second* logo inside the Card itself.

## Applying this to existing/new screens

1. Reach for `bg-primary` / `text-primary` / `bg-card` / `border-border` tokens first; hardcode a hex only for the decorative `rgba(74,124,255,…)` rings above (never on a button).
2. Any `<CardTitle>`, page `<h1>`/`<h2>`, or dialog `<DialogTitle>` gets the Manrope-extrabold treatment — a title left in plain shadcn `font-semibold` is the single most common "this doesn't feel like DocuLens yet" tell.
3. The one primary button per view/form is the default variant: solid primary, no glow, no hover lift. Everything else stays on shadcn's outline/ghost/destructive/link variants unchanged.
4. Prefer extending an existing shared component (`EmptyState`, `SourceChip`, `Switch`-based toggles) over hand-rolling a new pattern that almost matches one that already exists.
5. This is a visual-language guide, not a license to restructure layouts or change behavior — token/class changes only unless the task explicitly asks for more.
