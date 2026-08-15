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
- Custom colored shadows throughout the codebase are hardcoded to the **dark-mode** primary as `rgba(74,124,255, alpha)`. This is the established convention (not fully theme-reactive, but consistent) — match it, don't invent a different rgba.
- `--radius: 0.5rem` base; in practice the app almost never uses the small end of that scale for containers — see Radius below.

## Typography

Two families, loaded in `app/layout.tsx` via Google Fonts, mapped by role — never by "what looks good here", always by role:

- **Manrope (`font-['Manrope']`), weight 700–800 (`font-bold`/`font-extrabold`)** — every heading, every eyebrow/label, every primary button's text, every stat/number. This is the family that carries the brand's voice.
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

Tailwind's static utilities, not tied to the `--radius` CSS var scale in practice:
- `rounded-full` — chips, pill badges, avatar.
- `rounded-xl` — buttons, list rows, icon boxes, shadcn Card default (already correct, don't override).
- `rounded-2xl` — cards, search bars, empty-state icon wells, pricing cards.
- `rounded-3xl` — only the landing page's glass CTA card. Reserve for one hero-level moment per page, not a default.

## Shadow & elevation

Three tiers, pick by what the element is:

1. **Resting card** (Card, form panel): `shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]` — neutral, not colored.
2. **Primary action button** (the one thing on the screen you want clicked): `shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all` plus `font-['Manrope'] font-bold`. Scale the numbers up (`0_8px_32px`, hero-sized) only for a page's single hero CTA, never for a secondary button.
3. **Ambient glow** (decorative, page/section background): blurred primary-tinted circles, e.g. `w-64 h-64 rounded-full bg-primary/[0.07] blur-[90px] pointer-events-none`. Always `pointer-events-none`, always `absolute`/`fixed` and out of the content flow. Used to keep otherwise-empty backgrounds (auth pages, hero sections) from feeling bare — not decoration for decoration's sake, so skip it on already-dense screens (tables, lists).

Destructive actions do **not** get a colored glow — keep them to plain `variant="destructive"` plus `font-['Manrope'] font-bold` for label consistency. A red glow would read as more alarming than the app's voice intends.

## Icons

Two icon sets coexist by role (this is an imperfect but real convention — converge new code toward it rather than picking whichever import is already at hand):
- **Material Symbols Outlined** (`<span className="material-symbols-outlined">`, add `style={{ fontVariationSettings: "'FILL' 1" }}` when it should read as "active"/filled) — navigation, brand/hero moments, source-type icons in chips.
- **lucide-react** — dialogs, data tables, form controls, toasts, anything utility-feeling (Loader2, Trash2, Eye/EyeOff, Check, AlertCircle).
Don't use raw emoji as UI icons (🎯💡 etc.) — pick a lucide icon instead; emoji don't match either icon set and render inconsistently across platforms.

## Structural motifs

- **Eyebrow → heading → subtext**, centered, above any major section (see landing page's Features/Pricing/CTA sections). Eyebrow uses the label pattern above; heading is Manrope extrabold, often two lines with a `<br />`; subtext is Inter, muted.
- **Empty state**: icon in a `p-5 rounded-2xl bg-muted/40 border border-border/50` well, bold Manrope heading ("No data yet"), Inter subtext, and the CTA button *inside* the same centered block — never split the CTA off into a header bar that's disconnected from the empty illustration. Reuse the shared `EmptyState` component in `sources-panel.tsx` rather than hand-rolling a near-duplicate.
- **Pill/badge with pulse dot** (`<span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />` next to short uppercase text) — reserve for things that are genuinely live/status-like ("Now in Beta", a real-time indicator). Don't use the pulse animation on a static label like a role badge — it implies activity that isn't there.
- Auth pages (`app/(auth)/*`) carry the wordmark lockup + ambient orbs from `app/(auth)/layout.tsx` — don't strip that when touching login/register, and don't add a *second* logo inside the Card itself.

## Applying this to existing/new screens

1. Reach for `bg-primary` / `text-primary` / `bg-card` / `border-border` tokens first; hardcode a hex only for the established `rgba(74,124,255,…)` shadow convention above.
2. Any `<CardTitle>`, page `<h1>`/`<h2>`, or dialog `<DialogTitle>` gets the Manrope-extrabold treatment — a title left in plain shadcn `font-semibold` is the single most common "this doesn't feel like DocuLens yet" tell.
3. The one primary button per view/form gets the shadow+hover-lift treatment from tier 2 above; everything else stays on shadcn's default/outline/ghost variants unchanged.
4. Prefer extending an existing shared component (`EmptyState`, `SourceChip`, `Switch`-based toggles) over hand-rolling a new pattern that almost matches one that already exists.
5. This is a visual-language guide, not a license to restructure layouts or change behavior — token/class changes only unless the task explicitly asks for more.
