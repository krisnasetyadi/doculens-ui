# React Best Practices

A structured collection of React performance rules for this codebase, optimised for AI agents and code review.

## Structure

- `rules/` - Individual rule files (one per rule)
  - `_sections.md` - Section metadata (titles, impacts, descriptions)
  - `_template.md` - Template for creating new rules
- `metadata.json` - Document metadata (version, organisation, abstract)
- `AGENTS.md` - Compiled rule reference (maintained manually)
- `SKILL.md` - Quick-reference index of all rules

## Maintaining This Collection

`AGENTS.md` is maintained by hand — there is no build toolchain in this repo. When you add, edit, or delete a rule file:

1. Make your changes to the relevant file(s) under `rules/`.
2. Update `AGENTS.md` to reflect the change (add/edit/remove the corresponding section).
3. Update `SKILL.md` if the rule appears in the quick-reference index.

## Creating a New Rule

1. Copy `rules/_template.md` to `rules/area-description.md`
2. Choose the appropriate area prefix:
   - `async-` for Eliminating Waterfalls (Section 1)
   - `bundle-` for Bundle Size Optimization (Section 2)
   - `server-` for Server-Side Data Fetching (Section 3, **N/A** — Vite SPA; no rule files present)
   - `client-` for Client-Side Data Fetching (Section 3 in this codebase)
   - `rerender-` for Re-render Optimization (Section 4)
   - `rendering-` for Rendering Performance (Section 5)
   - `js-` for JavaScript Performance (Section 6)
   - `advanced-` for Advanced Patterns (Section 7)
3. Fill in the frontmatter and content following `_template.md`
4. Add a matching entry to `AGENTS.md` and `SKILL.md`

## Rule File Structure

Each rule file should follow this structure:

```markdown
---
title: Rule Title Here
impact: MEDIUM
impactDescription: Optional description
tags: tag1, tag2, tag3
---

## Rule Title Here

Brief explanation of the rule and why it matters.

**Incorrect (description of what's wrong):**

```typescript
// Bad code example
```

**Correct (description of what's right):**

```typescript
// Good code example
```

Optional explanatory text after examples.

Reference: [Link](https://example.com)
```

## File Naming Convention

- Files starting with `_` are special (excluded from the index)
- Rule files: `area-description.md` (e.g., `async-parallel.md`)
- Section is determined by the filename prefix

## Impact Levels

- `CRITICAL` - Highest priority, major performance gains
- `HIGH` - Significant performance improvements
- `MEDIUM-HIGH` - Moderate-high gains
- `MEDIUM` - Moderate performance improvements
- `LOW-MEDIUM` - Low-medium gains
- `LOW` - Incremental improvements

## Acknowledgments

Originally created by [@shuding](https://x.com/shuding) at [Vercel](https://vercel.com).
