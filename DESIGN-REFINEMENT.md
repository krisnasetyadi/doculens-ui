# DocuLens Design Refinement (MS-681)

This file records the refined look from the UI/UX refinement and the **target values** for new and restyled UI. It extends the `doculens-design` skill (which is unchanged) and does not replace it: that skill still describes the voice of the product (Manrope speaks, Inter is read, one blue accent, eyebrow and wordmark patterns, empty-state shape, icon sets by role). Where the two differ, the table "Where this overrides doculens-design" lists which value wins.

## Rules

1. **One accent, blue.** Green, amber and red mean status only.
2. **Tokens, not hex.** Use `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`. A raw hex is allowed only inside a shared style module.
3. **Manrope speaks** (titles, labels, buttons, numbers). **Inter is read** (body, descriptions, cells, inputs).
4. **Hairlines, not fills.** Surfaces are separated by a 1px `border-border` plus `shadow-xs`. Cards are `bg-card`, never `bg-muted`.
5. **One primary button per view.** It alone gets the blue glow. Destructive never glows.
6. **Same thing, same look.** Dialogs use `lib/dialog-styles`, "..." menus use `lib/menu-styles`, delete uses `lib/danger-styles`, Settings uses `components/workspace/settings-ui`. If a class is missing, add it to the shared module, not inline.
7. **Light and dark both work.** Every light color has a dark partner. Check both.
8. **No decorative motion.** Short, eased, interruptible, off for `prefers-reduced-motion`.
9. **Touch is not optional.** Anything that opens on double click opens on a single tap for coarse pointers (`useCoarsePointer`).

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

Status tokens (new, to add to `globals.css` and use instead of raw hex or `text-amber-400`):

| Tone | Solid | Soft bg | Ink (text on soft) | Dark |
|---|---|---|---|---|
| success | `#39856a` | `#eaf5ef` | `#3d795f` | text `#34d399` on `rgba(16,185,129,.10)` |
| warning | `#ad7546` | `#fff4df` | `#946528` | text `#fbbf24` on `rgba(245,158,11,.10)` |
| danger | `destructive` `#e7000b` | `#fbecee` | `#9f454c` | text `#f87171` on `rgba(239,68,68,.10)` |
| info | `primary` | `#edf3ff` | `#435f9e` | text `#82a5ff` on `rgba(74,124,255,.10)` |

Danger is one red: the `destructive` token for fills and delete text (through `lib/danger-styles`), `-soft` and `-ink` for status tints. Do not add a fourth red.

File type colors (one set, light bg / fg, dark bg / fg): PDF `#fbeeee` `#bd4f52` / `#42222d` `#f87171`; DOC `#e5edff` `#2f5fdc` / `#20365e` `#82a5ff`; CSV and XLSX `#e9f4ee` `#3f8a6b` / `#17443d` `#50d5a5`; TXT `#efebfb` `#6a52c0` / `#342550` `#b69cff`; WhatsApp `#e9f4ee` `#39856a` / `#173c2b` `#4ade80`; other `#fff4df` `#946528` / `#473415` `#fbbf24`.

Overlay behind dialogs and sheets is one token, `--overlay` (`rgba(24,32,51,.45)` light, `rgba(0,0,0,.6)` dark). Primary glow is a token per theme (`--glow` `.30`, hover `.40`, built from that theme's primary), not a fixed dark-blue rgba.

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
| Button | Manrope | 12 / 700 (13 on large) |
| Eyebrow | Manrope | 11 / 700, caps, +0.2em |
| Table head, badge | Manrope | 10 / 700, caps |
| Chat answer | Inter | 15 / 1.7 |
| Base | Inter | 14 / 1.5 |
| Body, menu item, description | Inter | 13 / 1.6 |
| Input text, small | Inter | 12 or 13 |
| Label | Inter | 11 / 600 |
| Caption, meta | Inter | 11 / 16px line |

## Radius

Five radii. A nested shape uses its parent's radius minus the padding between them (rail 12 with 4px padding gives pill 8).

| Radius | Tailwind | Use |
|---|---|---|
| 4 | `rounded-sm` | Progress bars, scrollbar thumbs |
| 6 | `rounded-md` | Badges |
| 8 | `rounded-lg` | Icon buttons, notices, menu rows, tab pill |
| 12 | `rounded-xl` | Buttons, fields, cards, menus, nav items, tab rail |
| 16 | `rounded-2xl` | Dialogs, chat bubble, composer, empty-state well |
| full | `rounded-full` | Chips, avatars |

No arbitrary radius (`rounded-[14px]`, `[10px]`, `[11px]`). Pick the nearest one above.

## Elevation

| Token | Value | Use |
|---|---|---|
| card | `0 1px 2px rgba(24,32,51,.05)` (Tailwind `shadow-xs`) | Cards, lists, fields |
| pop | `0 8px 24px rgba(24,32,51,.11)` | Menus, toasts |
| float | `0 14px 38px rgba(24,32,51,.08)` | Composer, table of contents |
| dialog | `0 24px 70px rgba(24,32,51,.15)` | Dialogs, drawers, Settings |
| glow | `0 4px 14px var(--glow)`, hover `0 6px 18px var(--glow-hover)` | The one primary button |

Dark values use black at 0.3, 0.4, 0.5, 0.5. Do not use `shadow-[0_2px_16px_...]`; it is replaced by the card shadow.

## Spacing

4px base: 4, 8, 12, 16, 20, 24, 32, 48. Cards pad 20 to 24, list rows pad 12 vertically, dialogs pad 24 with 20 between blocks. Sources page column max 1110, side padding `clamp(24px, 5vw, 72px)`.

## Components

**Buttons.** Three heights, one radius (12), Manrope 12 bold. Small 32, default 36, large 40 (13px text). Primary: `bg-primary`, glow, hover lift of 1px, `hover:bg-primary-hover`, `active:bg-primary-pressed`. Secondary: `variant="outline"`, `bg-card`, hairline, card shadow. Ghost for low emphasis. Danger outline for delete in a toolbar, danger solid for the confirm in a delete dialog. Icon button: 32 square, radius 8, grey until hover. Disabled: 50% opacity, `cursor-not-allowed`, no glow.

**Fields.** One field: 40px, radius 12, `px-3.5`, Inter 13, `bg-card`, hairline, card shadow. Hover border `foreground/20`, focus border `primary/50` with a 3px `primary/12` ring. Error uses `destructive` border and ring. Disabled is 50% opacity on `bg-muted`. Label above (Inter 11 / 600), hint below (11px muted).

**Switch.** 34 by 20, track `foreground/18`, checked `primary`, disabled 50%.

**Badge.** Manrope 10 / 700 caps, radius 6, soft background plus ink text, optional dot. **Notice**: radius 8, soft background plus ink text, icon plus bold lead sentence. Always pair color with a label or icon.

**Tabs (Sources).** A segmented rail: radius 12, hairline, `bg-card`, 4px padding. A single pill (`bg-accent`, 1px `primary/20` ring, radius 8) slides under the active tab over 300 ms with `cubic-bezier(0.32, 0.72, 0, 1)`, and does not animate on first render or with reduced motion. Tab: 36px tall, Manrope 13 / 700, Lucide icon 16, active text `primary`.

**Menus.** One menu for every "...", and for the Sources sort filter. Surface: radius 12, `bg-popover`, hairline, 4px padding, pop shadow. Rows: 28px, radius 8, Inter 13, 8px icon gap, hover `accent`. Danger row: danger text, `danger-soft` hover. Separator 1px with 4px margin. Opens 8px below the trigger, left edges aligned, flips if there is no room. Use `lib/menu-styles`. A menu section label is Manrope 10 / 700 caps.

**Sort filter (Sources).** A ghost icon button (Lucide `ListFilter`, 18px) opens the menu: label "Sort by", then Name, Date, File type. The active row shows direction (arrow) and a check; choosing it again flips the direction.

**Dialogs.** Radius 16, `bg-card`, hairline, 24px padding, 20px gap, dialog shadow, overlay token. Title Manrope 19 / 800, description Inter 13 muted. Footer right aligned, Cancel (outline) then the action. A dialog that runs async work disables both buttons, shows a spinner, and ignores Escape and outside click until it settles (`DeleteConfirmDialog`). Delete confirm: label "Delete", pending label "Deleting...". Names and renamed titles start with a capital letter.

**Sources rows.** Four visible states. Active: full color, switch on. Inactive: content at 60% opacity, switch off, still selectable. Uploading: progress bar (4px, `primary`) plus a stage label, switch disabled. Error: red "Upload failed" caption (a ghost Retry button is the target, not yet in code). Single click selects, double click opens, a single tap opens on touch. Hover-only controls are always visible on touch.

**Chat.** User bubble: `bg-accent`, 1px `selected` border, radius 16 with a 4px bottom-right corner, max 78%. Assistant answer: no bubble, Inter 15 / 1.7. Composer: `bg-card`, hairline, radius 16, float shadow, send button 40px radius 12 with the glow. While the assistant answers, the composer text is disabled (50% opacity) and send is 30% opacity with no shadow.

**Sidebar.** Item: radius 12, Manrope 15 / 700, selected fill `selected` with a 4px `primary` bar on the left, text `primary`. Hover `foreground/6`. The sidebar can collapse and resize (cubic-bezier 0.32, 0.72, 0, 1).

**Scrollbars in Settings.** Visible only while scrolling: the thumb is transparent until `data-scrolling` is set and fades out one second after the last scroll (`useAutoHideScrollbar`, class `auto-hide-scrollbar`).

## Loading, empty, disabled

- Button or row in progress: one spinner (Lucide `Loader2`, 16px, `animate-spin`) and the control disabled. Create, rename and delete of a file show the row spinner until the server answers.
- A list or card that fetches: a skeleton in the same frame with the same heights as the real content (text `bg-muted-foreground/15`, tiles `bg-muted`). Wrap in `role="status"` with an `sr-only` label.
- Long work: progress bar plus a stage label.
- One toast system: `use-toast`. Do not add `sonner`.
- Empty state: icon in a `p-5 rounded-2xl bg-muted/40 border border-border/50` well, Manrope bold heading, Inter muted subtext, and the CTA inside the same block (`components/empty-state.tsx`).

## Where this overrides doculens-design

| Topic | doculens-design | This file |
|---|---|---|
| Card radius | `rounded-2xl` | `rounded-xl` (12). `rounded-2xl` is for dialogs, bubble, composer |
| Resting shadow | `0_2px_16px rgba(0,0,0,.06)` | `shadow-xs` card shadow |
| Glow color | fixed `rgba(74,124,255)` | `--glow` per theme |
| Raw hex | only the glow rgba | none outside shared style modules |
| Buttons | shadcn defaults plus the primary glow | 32 / 36 / 40, radius 12 |
| Fields and menus | not specified | 40px r12, menu r12 with 28px rows r8 |
| Status colors | not specified | success, warning, danger, info tokens |

## Status in code (MS-681)

Already applied: the new surface and primary tokens, shared dialog, menu and danger modules, Settings surfaces, the Sources tab rail and sort dropdown, source row states, chat composer and bubble, the collapsible sidebar, Settings scrollbar auto-hide.

Not yet applied (migrate screen by screen, one commit per area, never mixed with path moves): the status tokens and file type tokens, `--overlay` and `--glow`, the 32 / 36 / 40 button scale and 40px field, the five-radius scale (14px, 10px and 11px radii still exist), the four shadow tokens (the `0_2px_16px` shadow is still on auth, payment, home, history, landing, the chat composer, chat search and the profile menu), menu rows at radius 8, removal of the scaled sizes in Gap Check (0.9801) and the sidebar (0.92), a single toast system, and one spinner.

## Before you finish a UI change

- [ ] Uses a shared module, or adds a class to one.
- [ ] No raw hex, no arbitrary radius, no `0_2px_16px` shadow.
- [ ] Titles Manrope extrabold, body Inter, only the nine sizes.
- [ ] One primary button, destructive without glow.
- [ ] Checked in light and dark, at 900px and 620px, and with a coarse pointer.
- [ ] Skeleton matches the real layout.
- [ ] No em dashes in code or docs.
