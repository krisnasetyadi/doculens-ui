# DocuLens Design Refinement (MS-681, corner standard)

This file records the refined look from the UI/UX refinement and the **target values** for new and restyled UI. It started with MS-681 and was rewritten for the corner standard ticket (one corner per kind of element, no button glow or lift, one component per recurring thing). Where it differs from the first version, this version wins. It extends the `doculens-design` skill and does not replace it: that skill still describes the voice of the product (Manrope speaks, Inter is read, one blue accent, eyebrow and wordmark patterns, empty-state shape, icon sets by role). The skill was updated by the corner standard ticket only for the radius table and the no glow, no hover lift rule; where it is silent or older, this file wins, and the table "Where this overrides doculens-design" lists which value. The component index is the "Shared building blocks" table below.

## Rules

1. **One accent, blue.** Green, amber and red mean status only.
2. **Tokens, not hex.** Use `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`. A raw hex is allowed only inside a shared component or style module.
3. **Manrope speaks** (titles, labels, buttons, numbers). **Inter is read** (body, descriptions, cells, inputs).
4. **Hairlines, not fills.** Surfaces are separated by a 1px `border-border` plus `shadow-xs`. Cards are `bg-card`, never `bg-muted`.
5. **No glow, no hover lift.** The main action is the solid primary colour and nothing else; hover only darkens it. Destructive never glows either.
6. **Same thing, same component.** Shared components define the default visual style. Use `variant` and `size` for a difference that has a clear meaning and can be reused, and use `className` primarily for layout (width, margin, position, display). A local visual exception is allowed when a component has a specific requirement that does not belong in a shared variant. Add a variant or size when the same difference appears again, instead of copying the classes. The index is the "Shared building blocks" table below. "..." menus use `lib/menu-styles`, delete uses `lib/danger-styles`, Settings layout uses `components/workspace/settings-ui`.
7. **Light and dark both work.** Every light color has a dark partner. Check both.
8. **No decorative motion.** Short, eased, interruptible, off for `prefers-reduced-motion`.
9. **Touch is not optional.** Anything that opens on double click opens on a single tap for coarse pointers (`useCoarsePointer`).
10. **One corner per kind of element.** See Radius. A screen never sets a corner on a shared component.

## Color

Surface ladder, light: sidebar `#e8effc`, canvas `#f2f5fc`, card `#fcfdff`. Tokens live in `app/globals.css`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#f2f5fc` | `#04091a` | App canvas |
| `card` / `popover` | `#fcfdff` | `#080f26` | Cards, dialogs, menus |
| `foreground` | `#182033` | `#e8eeff` | Text, headings |
| `muted-foreground` | `#56627a` | `#7a8fb5` | Labels, descriptions, captions |
| `border` / `input` | `#e0e5ef` | `#1a2850` | Every hairline |
| `primary` | `#3b6ff0` | `#4a7cff` | CTA, active nav, links, focus ring |
| `primary-hover` / `-pressed` | `#2f5fdc` / `#274fbf` | `#3f6ff0` / `#3560dc` | Button states |
| `accent` / `secondary` | `#e5edff` | `#111d42` | Hover fill, soft blue wash, active pill |
| `selected` | `#d7e3ff` | `#182a5e` | Active nav row, selected item |
| `muted` | `#e8edf7` | `#0d1630` | Skeleton tiles, chips, code |
| `sidebar` | `#e8effc` | `#060d22` | Sidebar background |

Status tokens, in `app/globals.css` (`--success`, `--success-soft`, `--success-ink`, the same for `warning`, and `--danger-soft`, `--danger-ink`, `--info-soft`, `--info-ink`). Use them as `bg-success-soft text-success-ink`, `bg-warning` (a bar or a dot), `border-warning/30`. Never a raw hex, `amber-*`, `emerald-*`, `green-*` or `red-*` for status.

| Tone | Solid | Soft bg | Ink (text on soft) | Dark |
|---|---|---|---|---|
| success | `#39856a` | `#eaf5ef` | `#3d795f` | text `#34d399` on `rgba(16,185,129,.10)` |
| warning | `#ad7546` | `#fff4df` | `#946528` | text `#fbbf24` on `rgba(245,158,11,.10)` |
| danger | `destructive` `#e7000b` | `#fbecee` | `#9f454c` | text `#f87171` on `rgba(239,68,68,.10)` |
| info | `primary` | `#edf3ff` | `#435f9e` | text `#82a5ff` on `rgba(74,124,255,.10)` |

In dark mode the solid of success and warning is the same light tone as the ink, since a dark solid on navy would not read.

Two things are kept apart, and they are not styled the same:

- **A short message about a limit** (the file-limit banner, "Monthly quota reached" in the chat composer, a rate limit) is a `Notice size="sm"`, tone **warning**, and looks the same everywhere. Reaching a limit is not a failure: a file limit and an exhausted workspace token pool are both yellow.
- **A Usage view** (the bars, badges and cards in Settings: `quotaTone`, `storageTone`) has its own scale: primary below 80%, **warning** from 80%, **danger** once the limit is hit.

**Danger** otherwise means a failure: a request or an upload that failed, an invalid field, a destructive action.

File type colors (one set, light bg / fg, dark bg / fg): PDF `#fbeeee` `#bd4f52` / `#42222d` `#f87171`; DOC `#e5edff` `#2f5fdc` / `#20365e` `#82a5ff`; CSV and XLSX `#e9f4ee` `#3f8a6b` / `#17443d` `#50d5a5`; TXT `#efebfb` `#6a52c0` / `#342550` `#b69cff`; WhatsApp `#e9f4ee` `#39856a` / `#173c2b` `#4ade80`; other `#fff4df` `#946528` / `#473415` `#fbbf24`.

Overlay behind dialogs and sheets is one token, `--overlay` (`rgba(24,32,51,.45)` light, `rgba(0,0,0,.6)` dark). There is no glow token: a button never glows.

## Typography

Nine sizes only: 10, 11, 12, 13, 14, 15, 19, 22, 28. Manrope weights 600, 700, 800. Inter weights 400, 500, 600. Do not use `font-bold` with Inter.

| Role | Family | Size / weight |
|---|---|---|
| Page title | Manrope | 28 / 800, tracking -0.03em |
| Settings title | Manrope | 22 / 800 |
| Dialog title | Manrope | 19 / 800 |
| Figure | Manrope | 24 / 700, tabular numbers |
| Section title, row title | Manrope | 13 / 700 |
| Sidebar nav | Manrope | 15 / 700 |
| Button | Manrope | 13 / 700 (12 on small and compact) |
| Eyebrow | Manrope | 11 / 700, caps, +0.2em |
| Table head, badge | Manrope | 10 / 700, caps |
| Chat answer | Inter | 15 / 1.7 |
| Base | Inter | 14 / 1.5 |
| Body, menu item, description | Inter | 13 / 1.6 |
| Input text | Inter | 14 (12 on a compact field) |
| Label | Inter | 11 / 600 |
| Caption, meta | Inter | 11 / 16px line |

Classes: write `font-manrope` and `font-inter` (utilities from `@theme` in `app/globals.css`, backed by `next/font`), never `font-['Manrope']`. `next/font` self-hosts the families and gives each a metric-adjusted fallback, so text does not change face or shift the layout when the font arrives. The icon font (Material Symbols) is not on `next/font`: it loads with `display=block`, so an icon name such as `hub` is never painted as text, and `.material-symbols-outlined` owns a 1em square so nothing moves when it arrives.

## Radius

One corner standard, taken from the shared (shadcn) components. Each kind of element has one corner everywhere.

| Area | Corner | Tailwind | Applies to |
|---|---|---|---|
| Controls | 6px | `rounded-md` | Buttons in every size, icon-only buttons, text fields, text areas, selects, badges, tooltips, popovers, dropdown menus, loading skeletons |
| Items inside a menu | 4px | `rounded-sm` | Options in a dropdown, select or command list, checkboxes |
| Overlays and notices | 8px | `rounded-lg` | Dialogs, confirmation dialogs, inline alerts and notices, clickable list rows, sidebar nav items |
| Surfaces | 12px | `rounded-xl` | Cards, panels, toasts, empty-state icon wells, icon tiles, the tab rail, the chat bubble and composer |
| Pills | full | `rounded-full` | Avatars, switches, progress bars, chips, status dots |

- The corner comes from the component. A button beside a text field always has the field's corner. No `rounded-*` on `Button`, `IconButton`, `Input`, `Textarea`, `SelectTrigger`, `Badge`, `Skeleton`, `DialogContent`, `AlertDialogContent`.
- A container that is not a shared component (list row, panel, well) uses the corner of its area. Prefer `Panel` for a bordered surface.
- Nothing is larger than 12px in the workspace, auth and payment pages, except pills. No `rounded-2xl`, `rounded-3xl`, `rounded-[14px]`, `[10px]`, `[11px]`. Only the landing page's decorative sections may go larger.
- A nested shape is never rounder than its parent minus the padding between them. The Sources tab rail is the one place this is applied to a tab: a 12px rail with 4px padding holds an 8px active pill.
- A small label is a badge (6px). A chip you can click, or a count bubble, is a pill.

## Elevation

| Token | Value | Use |
|---|---|---|
| card | `shadow-xs` (`0 1px 2px rgba(24,32,51,.05)`) | Cards, panels, lists, fields. Nothing else sets a resting shadow |
| pop | `0 8px 24px rgba(24,32,51,.11)` | Menus, popovers, toasts |
| dialog | `shadow-lg`, set once in `ui/dialog` and `ui/alert-dialog` | Dialogs, confirmation dialogs, Settings. A screen does not set its own |
| float | `shadow-lg` | Things that float over content (table of contents, a drag preview) |

Dark values use black at 0.3 to 0.5. No button has a shadow of any kind, coloured or neutral, and there is no glow token: the `--glow` token and the `0_4px_14px` button shadow are gone. Do not use `shadow-[0_2px_16px_...]`; it is replaced by the card shadow. The only coloured rings that remain are decorative, on the brand mark and the ambient orbs.

## Spacing

4px base: 4, 8, 12, 16, 20, 24, 32, 48. Cards pad 20 to 24, list rows pad 12 vertically, dialogs pad 24 with 20 between blocks. Sources page column max 1110, side padding `clamp(24px, 5vw, 72px)`.

## Components

### Shared building blocks

The index of what exists. Pick a variant or a size; use `className` primarily for layout.

| Need | Component | Choices |
|---|---|---|
| Button | `components/ui/button.tsx` | variant `default`, `outline`, `ghost`, `destructive`, `link`; size `default`, `sm`, `xs`, `lg`, `icon`, `icon-sm` |
| Icon-only button | `components/icon-button.tsx` | `size="sm"` 28px or the default 36px; required `label`; `danger` |
| Page-to-page button | `components/nav-button.tsx` | a `Button` with the loading state built in |
| Text field | `components/ui/input.tsx` | `size` `default` or `sm`; `inputVariants()` for anything field-shaped |
| Field label, hint, error | `ui/label.tsx`, `components/forms/field-hint.tsx`, `components/forms/*` | no class |
| Badge | `components/ui/badge.tsx` | variant `default`, `secondary`, `info`, `success`, `warning`, `destructive`, `outline` |
| Inline feedback | `components/notice.tsx` | tone `success`, `error`, `warning`, `info` |
| Bordered surface | `components/panel.tsx` (`panelVariants` for a non-div) | tone `default`, `muted`, `dashed`; padding `none`, `sm`, `md`, `lg` |
| Card with slots | `components/ui/card.tsx` | title Manrope extra-bold, description Inter muted |
| Icon on a rounded square | `components/icon-tile.tsx` | size `md`, `lg`; tone `muted`, `primary`, `accent`, `danger`, `none` |
| Logo tile | `components/brand-mark.tsx` | size `sm`, `md` |
| Menu | `components/action-menu.tsx` | values in `lib/menu-styles` |
| Empty state | `components/empty-state.tsx` | |
| Tooltip | `components/ui/tooltip.tsx` | one `TooltipProvider` in `app/providers.tsx` |

**Buttons.** One shared `Button`. Variants, and only these: primary (`default`, solid), `outline`, `ghost`, `destructive`, `link`. Sizes: `default` 36px (40px on a phone), `sm` 32, `xs` 28, `lg` 40. Radius 6, label Manrope 13 bold (12 on `sm` and `xs`), set once in the shared button. Primary: `bg-primary`, `hover:bg-primary-hover`, `active:bg-primary-pressed`, no shadow, no lift. Outline is the secondary: hairline, no shadow. Ghost for low emphasis. `destructive` for the confirm in a delete dialog and for Delete in a toolbar. A `link` is text: it drops the height and padding and is primary blue. Disabled: 50% opacity, set by the `disabled` prop, never by custom classes. "Back" and breadcrumbs are muted text with a primary hover and are not `Button variant="link"`: the ticket asks for the link variant, but it renders blue and that was not adopted.

**Icon-only buttons.** Two sizes: 28px for an action inside a row or message (`size="sm"`), 36px elsewhere. Always through `IconButton`: it renders the tooltip and the screen-reader label from the required `label`. A ghost icon button is muted at rest and a `danger` one turns red on hover, so a call site sets no colour. Do not size one with `size-*` or `h-* w-*`.

**Button loading.** The loading behaviour lives in `Button`, screens do not rebuild it: `<Button loading={saving} loadingText="Saving…" icon={<Save />}>Save</Button>`. While `loading` the button is disabled, a spinner takes the place of `icon`, the label becomes `loadingText`, and it carries `aria-busy`. An icon-only button (`size="icon*"`) shows just the spinner. Pass the leading icon as `icon`, not inside the children, so the spinner can replace it. A button that goes to another page is `NavButton` (`components/nav-button.tsx`): it answers the click with the same loading state ("Opening…") until the next page renders, and cannot be clicked twice.

**Form lock.** While a form's action runs, every field is disabled and the dialog cannot be dismissed. Wrap the fields and the Cancel button in `FormFieldset busy={saving}` (`components/forms/form-fieldset.tsx`, a native `<fieldset disabled>`): inputs, selects, switches and file inputs lock together and keep their values. Put the form's layout classes (`space-y-*`, `divide-y`) on the fieldset with `block`, since a `contents` fieldset has no box for them. The dialog ignores Escape and outside click while busy.

**Fields.** One field: `Input` default is 36px (`sm` 28px for a dense row or table cell), radius 6, `px-3`, Inter 14 (12 on `sm`), `bg-card` (`dark:bg-input/30`), so a field on the page canvas reads as a white field, hairline `border-input`, card shadow. Focus border `ring` with a 3px `ring/50` ring. Error uses the `destructive` border and ring. Disabled is 50% opacity. Label above (`Label`: Inter 12 / 600), hint or error below (`FieldHint`: 11px muted or destructive). A date picker, a combobox trigger and a search box are not Inputs but take `inputVariants()`, so they match.

**Switch.** 34 by 20, track `foreground/18`, checked `primary`, disabled 50%.

**Badge.** One badge: Manrope 10 / 700 caps, radius 6, soft background plus ink text. The tone is the only choice: `secondary` (neutral, the default), `info`, `success`, `warning`, `destructive`, `outline`, and a solid `default` for the one that must stand out. **Notice** (`components/notice.tsx`): radius 8, soft background plus ink text, icon plus a line of text, tone `success`, `error`, `warning` or `info`. Two sizes: the default (12px, for Settings and forms) and `size="sm"` (11px, centred on one line) for a short message such as a limit that was reached. The part that says what happened is wrapped in `NoticeLead` (bold), the rest stays regular. Always pair color with a label or icon.

**Panel, tile, brand mark.** `Panel` is the bordered surface: radius 12, hairline, card shadow (`muted` is a recessed box, `dashed` a drop zone). `IconTile` is the rounded square behind an icon (36 or 40px, radius 12). `BrandMark` is the logo tile, with the ring growing on hover when it sits inside a `group`.

**Tabs (Sources).** A segmented rail: radius 12 (a surface, which is why it differs from the "tabs are controls" row of the ticket), hairline, `bg-card`, 4px padding. A single pill (`bg-accent`, 1px `primary/20` ring, radius 8) slides under the active tab over 300 ms with `cubic-bezier(0.32, 0.72, 0, 1)`, and does not animate on first render or with reduced motion. Tab: 36px tall, Manrope 13 / 700, Lucide icon 16, active text `primary`.

**Menus.** One menu for every "...", and for the Sources sort filter: `ActionMenu` (`components/action-menu.tsx`, values in `lib/menu-styles`). A card that sizes to its labels, 200 to 230px wide, solid `#FCFDFF`, hairline `#DFE5EF`, radius 6 (`rounded-md`), 4px padding, shadow `0 8px 22px rgba(25,38,60,.10), 0 2px 5px rgba(25,38,60,.05)`. Rows: 37px (40px under `sm`, a touch target), radius 4 (`rounded-sm`), Inter 13 / 500, 10px between icon and label, text `#20283B`, icons `#63718A`, hover `#F2F5FB`; keyboard focus adds an inset ring. One separator, placed before the destructive row. A menu section label is Manrope 10 / 700 caps. The destructive row is a softer red, `#BD5553` with a `#FFF3F1` hover (dark: `red-400` on `red-500/10`). That is the one exception to "one red", for menu rows only: buttons and delete text elsewhere stay on the `destructive` token. The hex values live in `lib/menu-styles` and `lib/danger-styles`, shared modules, and nowhere else. Opens 8px below the trigger, left edges aligned, flips if there is no room. The "..." trigger is an `IconButton size="sm"`.

**Sort filter (Sources).** A ghost icon button (Lucide `ListFilter`, 18px) opens the menu: label "Sort by", then Name, Date, File type. The active row shows direction (arrow) and a check; choosing it again flips the direction.

**Dialogs.** Radius 8, `bg-card`, hairline, 24px padding, 20px gap, `shadow-lg`, overlay token, all set once in `ui/dialog` and `ui/alert-dialog`. Title Manrope 19 / 800 and description Inter 13 muted, also set there: a screen passes no title or description class. The close button is the shared 28px icon button. Footer right aligned: Cancel is `outline`, the confirming action is the default (primary), a destructive confirmation is `variant="destructive"`. A dialog that runs async work disables both buttons, shows a spinner, and ignores Escape and outside click until it settles (`DeleteConfirmDialog`). Delete confirm: label "Delete", pending label "Deleting…". Names and renamed titles start with a capital letter.

**Sources rows.** Four visible states. Active: full color, switch on. Inactive: content at 60% opacity, switch off, still selectable. Uploading: progress bar (4px, `primary`) plus a stage label, switch disabled. Error: red "Upload failed" caption (a ghost Retry button is the target, not yet in code). Single click selects, double click opens, a single tap opens on touch. Hover-only controls are always visible on touch.

**Chat.** User bubble: `bg-accent`, 1px `selected` border, radius 12 with a 4px bottom-right corner (`rounded-xl rounded-br-sm`), max 78%. Assistant answer: no bubble, Inter 15 / 1.7. Composer: a `Panel`, with the field focus ring when focused. Send is an `IconButton` (default variant, 36px) and is disabled, not restyled, while there is nothing to send or the assistant answers. A limit message above the composer (token limit, monthly quota, member cap) is a `Notice size="sm"` in warning, the same as the file-limit banner.

**Sidebar.** Item: radius 8 (a clickable row), Manrope 15 / 700, selected fill `selected` with a 4px `primary` bar on the left, text `primary`. Hover `foreground/6`. The New Chat button is a plain `Button`, its label on the centre line with the plus hanging off the left. The sidebar can collapse and resize (cubic-bezier 0.32, 0.72, 0, 1).

**Scrollbars in Settings.** Visible only while scrolling: the thumb is transparent until `data-scrolling` is set and fades out one second after the last scroll (`useAutoHideScrollbar`, class `auto-hide-scrollbar`).

## Loading, empty, disabled

- Button or row in progress: one spinner (Lucide `Loader2`, 16px, `animate-spin`) and the control disabled. Create, rename and delete of a file show the row spinner until the server answers.
- A list or card that fetches: a skeleton in the same frame with the same heights as the real content (text `bg-muted-foreground/15`, tiles `bg-muted`). Wrap in `role="status"` with an `sr-only` label.
- Long work: progress bar plus a stage label.
- One toast system: `use-toast`. Do not add `sonner`.
- Empty state: icon in a `Panel tone="muted" padding="lg"` well (radius 12), Manrope bold heading, Inter muted subtext, and the CTA inside the same block (`components/empty-state.tsx`).

## Loading system (MS-558)

This section replaces the first two bullets of "Loading, empty, disabled" above (the spinner is now `Button` loading, and the skeleton tones are `SKELETON_TONE`). The labels rule also replaces the "Deleting..." in Dialogs: it is "Deleting…".

Three kinds of waiting, each with one answer:

- **Content that loads for the first time and has a known shape** (list, table, card, settings panel, conversation thread, page fallback): a skeleton in the shape of the final content. A centered spinner is never the loading state of content.
- **An action the user started** (save, delete, upload, send, connect): the button's own loading state, see "Button loading" and "Form lock".
- **A process with stages** (upload, gap analysis run, Telegram sync): a progress bar or stage text. It is not replaced by a skeleton or a spinner.

Skeletons:

- One component, `components/ui/skeleton` (shimmer in `app/globals.css`, `.skeleton-shimmer`, a soft band on a seamless 1.8s linear loop with no pause between cycles, flat under `prefers-reduced-motion`). Do not write `animate-pulse` on a div.
- One tone set, `SKELETON_TONE` in `lib/skeleton-tones`: `text` (the default), `chip`, `tile`, `label`. The default is neutral, not `bg-accent` (blue, about 1.15:1 on a card; text is 1.23:1 light and 1.19:1 dark). Chips, tiles and buttons that are `bg-muted` or `bg-primary/10` in the real UI use the matching tone, so the placeholder reads as the same row dimmed.
- Same frame, same heights. Inside a 13px/20px title line draw a 9px bar, inside an 11px/16px meta line a 7px bar, the meta thinner and longer than the title. Vary the widths row by row so the block reads as text, not a grid.
- Only what waits for data is a placeholder. Titles, labels, tabs, toolbars and buttons that need no data render for real (a button that needs the data is disabled).
- First load only: `loading && list.length === 0`. A refresh of data already on screen shows no skeleton and no spinner; the data stays. A flag that is set by an effect also starts as loading when nothing is cached, or the empty state flashes for one frame before the skeleton.
- Never in place of another state: an error shows the error state, an empty list shows the empty state.
- Wrap in `role="status"` with an `sr-only` label in English that ends with one "…" ("Loading files…"); the bars are `aria-hidden`.

Public pages fetch no content, so they need no content skeletons, but three moments are handled: until the login state is known (`useAuthReady`), the landing header and the pricing plan buttons show a placeholder of the same size instead of the signed-out version; a call to action that navigates is a `NavButton`; the payment page shows a skeleton of its plan card.

Other rules in this section:

- Labels: one ellipsis character "…" (never "..."), English, in-progress form ("Saving…", "Deleting…", "Uploading…").
- Scroll roots that fill the page and may or may not overflow use `[scrollbar-gutter:stable_both-edges]`, so the content does not move sideways when the scrollbar appears after the data loads.
- One toast system: `use-toast`. Do not add `sonner`.
- Empty state: icon in a `Panel tone="muted" padding="lg"` well (radius 12), Manrope bold heading, Inter muted subtext, and the CTA inside the same block (`components/empty-state.tsx`).

## Where this overrides doculens-design

| Topic | doculens-design | This file |
|---|---|---|
| Card radius | `rounded-2xl` | `rounded-xl` (12). Nothing in the workspace is larger than 12 |
| Resting shadow | `0_2px_16px rgba(0,0,0,.06)` | `shadow-xs` card shadow |
| Primary button | blue glow, 1px hover lift | solid primary only, no glow, no lift |
| Glow color | fixed `rgba(74,124,255)` | none on a button; decorative rings only |
| Raw hex | only the glow rgba | none outside shared components and style modules |
| Buttons | shadcn defaults plus the primary glow | one `Button`, radius 6, sizes 28 / 32 / 36 / 40 |
| Fields and menus | not specified | field 36px r6, menu r6 with 37px rows r4 |
| Dialogs | `rounded-2xl` | `rounded-lg` (8), `shadow-lg`, title and description set once |
| Status colors | not specified | `success`, `warning`, `danger`, `info` tokens in `globals.css` |

## Status in code

Applied in MS-681: the surface and primary tokens, the shared menu and danger modules, Settings surfaces, the Sources tab rail and sort dropdown, source row states, the collapsible sidebar, Settings scrollbar auto-hide.

Applied in MS-558: the loading system (skeletons and their tones, `Button` loading, `FormFieldset`, `NavButton`, `useAuthReady`), `next/font` for Manrope and Inter with the icon font on `display=block`, the shared `ActionMenu`, one spinner (`Button` loading).

Applied in the corner standard ticket:

- The radius table, no glow and no lift on any button, dialogs at one corner, border and shadow.
- `Button` sizes and the `link` variant, `IconButton` (28 and 36px, tooltip and label, `danger`), one `TooltipProvider`.
- One component for each recurring thing: `Input` (`inputVariants`), `Badge`, `Notice`, `Panel`, `IconTile`, `BrandMark`, `Card` title and description, `FieldHint`, `Label`. The old class constants for buttons, dialogs, fields and badges are deleted.
- Status tokens in `app/globals.css`, read by `Badge`, `Notice`, `Toast`, the quota and storage views, the upload banner, the composer limit messages and the profile-menu dot.

Known deviations from the ticket (decided, not oversights):

- The Sources tab rail is a 12px surface with an 8px pill, not a 6px control.
- The History page keeps its own look (a pill search field, 16px cards, lowercase pill tags).
- "Back" and breadcrumbs are muted text, not `Button variant="link"` (which renders blue). "Retry", "Select all" and similar in-page actions do use the link variant.
- The remove-photo badge on the Settings avatar is a 20px circular `<button>` in the avatar corner, not a 28px `IconButton`, because 28px is too large there. It keeps its label and title.
- A short message about a limit is yellow (warning) everywhere; only the Usage views in Settings go red when a limit is hit.

Not yet applied: file type tokens (the file icon palette in `source-file-type-icon.tsx` is still its own set), `--overlay`, a single toast system, the scaled sizes in Gap Check (0.9801) and the sidebar (0.92), the upload banner and the skills error alert as `Notice` variants, and the datatable drag handles and the small chips (`source-chip`, `efficient-mode-chip`) as shared components. The menu and icon-button danger reds in `lib/menu-styles` and `lib/danger-styles` are a deliberate separate set.

## Before you finish a UI change

- [ ] Uses a shared component with a variant or size, or adds one. `className` is primarily layout; a local visual exception has a reason.
- [ ] No raw hex, no arbitrary radius, no `rounded-2xl`, no `0_2px_16px` shadow, no glow, no hover lift.
- [ ] Corners follow the Radius table; nothing in the workspace is larger than 12px except pills.
- [ ] Icon-only buttons are `IconButton`, 28 or 36px, with a `label`.
- [ ] Titles Manrope extrabold, body Inter, only the nine sizes.
- [ ] One primary button per view, destructive without glow.
- [ ] Checked in light and dark, at 900px and 620px, and with a coarse pointer.
- [ ] Skeleton matches the real layout.
- [ ] `npx tsc --noEmit` stays at 0.
- [ ] A limit message is a warning `Notice size="sm"`; red is for a failure.
- [ ] No em dashes in code or docs.
