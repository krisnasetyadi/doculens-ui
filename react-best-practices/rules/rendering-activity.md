---
title: Preserve DOM State for Frequently Toggled Components
impact: MEDIUM
impactDescription: preserves state/DOM, avoids expensive remounts on repeated show/hide
tags: rendering, visibility, state-preservation, css
---

## Preserve DOM State for Frequently Toggled Components

For components that toggle visibility frequently and are expensive to remount (complex forms, charts, heavy trees), keep them mounted and hide them with CSS instead of unmounting them. This preserves local state, avoids re-running `useEffect` setup, and skips the cost of re-creating the DOM tree.

**Incorrect (unmounts on hide — loses state, triggers full remount cost):**

```tsx
function Panel({ isOpen }: { isOpen: boolean }) {
  return isOpen ? <ExpensivePanel /> : null
}
```

**Correct (stays mounted, hidden via CSS — state and DOM are preserved):**

```tsx
function Panel({ isOpen }: { isOpen: boolean }) {
  return (
    <div style={{ display: isOpen ? undefined : 'none' }}>
      <ExpensivePanel />
    </div>
  )
}
```

**With Tailwind:**

```tsx
<div className={isOpen ? undefined : 'hidden'}>
  <ExpensivePanel />
</div>
```

**When to apply this pattern:**

- Tabs where switching back is common (form data, scroll position should survive)
- Dropdown menus or drawers with heavy content that take noticeable time to paint
- Charts or data-heavy panels that re-fetch or recalculate on mount

**When to stick with conditional rendering (`isOpen ? <X /> : null`):**

- The component is cheap to remount
- You want `useEffect` cleanup to run on hide (e.g. stopping a video, clearing a timer)
- The hidden content should not remain in the DOM for accessibility reasons (e.g. modal dialogs — use `display:none` only with `aria-hidden` or a proper dialog primitive)

> **Note:** `<Activity>` is a future React API (canary/experimental only, not available in React 18).
> Do not import it — use the CSS visibility pattern above until it is part of a stable React release.
