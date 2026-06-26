---
name: primeng
description: >-
  Use when working with PrimeNG UI components in this repo — adding/configuring a
  component (Table, Dialog, Select, Chart, Timeline, etc.), styling/theming via the
  Aura preset, or debugging PrimeNG behavior. Covers the two PrimeNG versions in
  play (21 in shell/mfe1, 19 in mfe2), the shared design-tokens preset, the
  federation skip-list gotcha, and how to pull authoritative component docs on demand.
---

# PrimeNG in the Unified Platform POC

## Versions (do not mix)

| App | Angular | PrimeNG | Theme pkg |
| --- | --- | --- | --- |
| `shell/` | 21 | `primeng@^21` | `@primeuix/themes` |
| `mfe1/` | 21 | `primeng@^21` | `@primeuix/themes` |
| `mfe2/` | 19 | `primeng@^19` | `@primeng/themes` |

When editing a component, **match the version of the app you're in**. The PrimeNG
21 and 19 APIs differ (import paths, template ref syntax, some inputs). mfe2's
theme import is `@primeng/themes/aura`; shell/mfe1 use `@primeuix/themes`.

## Fetching authoritative docs (the `.md` trick)

PrimeNG serves an LLM-friendly markdown version of any docs page by appending
`.md` to the URL. **Always pull the real docs before guessing an API** — these
versions move fast.

- Component page: `https://primeng.org/<component>.md`
  e.g. `https://primeng.org/table.md`, `https://primeng.org/dialog.md`,
  `https://primeng.org/select.md`, `https://primeng.org/chart.md`
- Index for models: `https://primeng.org/llms.txt` (key pages),
  `https://primeng.org/llms-full.txt` (everything)

Use `WebFetch` on the `.md` URL with a targeted prompt (e.g. "show the filtering
API and the template for a lazy-loaded table"). The `.md` page sometimes
truncates the API reference table — if you need props/events/methods that aren't
in it, fetch the plain `https://primeng.org/<component>` page as a fallback.

> Note these `.md` docs default to the **latest** PrimeNG (21). For mfe2 (v19),
> verify any API that looks new against the actual installed types in
> `mfe2/node_modules/primeng`.

## Layout: PrimeFlex, not hand-written CSS

Layout/spacing/typography use **PrimeFlex** utility classes (`primeflex@4`,
loaded via each app's `angular.json` styles, after primeicons). There should be
**no per-component `styles`/`styleUrl` CSS** in pages — use PrimeFlex utilities
(`flex`, `grid`/`col-12 md:col-6`, `gap-3`, `p-4`, `text-3xl`, `font-bold`,
`text-color-secondary`, `surface-100`, `border-round`, `border-bottom-1
surface-border`, color utils like `text-green-600`/`text-red-500`, etc.). For the
rare constraint PrimeFlex can't express (a fixed `max-height`/`min-width`, a
chart box height), use an inline `style="…"` attribute, not a CSS class.
PrimeFlex is CSS-only, so it is in each `federation.config.js` `skip` list (no JS
entry point — sharing it warns/fails).

Conventions established across the codebase:
- Cards → `<p-card>` (use `header="…"` or a `#header` template). The old
  `.up-card` div is gone.
- Status chips/badges → `<p-tag [value]" [severity]="…">` (`success | info |
  warn | danger | secondary`). The old `.up-chip`/`.up-source-badge` are gone.
- Page title/subtitle → `text-3xl font-bold m-0` / `mt-1 text-color-secondary`.
- The shell topbar is a `<p-toolbar>`; icon buttons are `<p-button [text] [rounded]>`.
- The shell's **dark sidebar** (`app.scss`) is the one intentional exception —
  it keeps its themed CSS because PrimeNG has no dark collapsible-sidebar nav.
- `shell/src/styles.scss` (copied identically to mfe1/mfe2) now holds ONLY base
  resets + scrollbar — no utility classes.

## How components are wired here

- Components are imported as **standalone modules** in each component's `imports`
  array (e.g. `TableModule`, `DialogModule`, `SelectModule`, `InputNumberModule`,
  `CardModule`, `TagModule`). Forgetting to add `CardModule`/`TagModule` after
  using `<p-card>`/`<p-tag>` is the most common build break (NG8001).
- PrimeNG is themed through one shared **Aura preset**:
  `upPrimePresetConfig` in `packages/design-tokens`, consumed via
  `definePreset(Aura, upPrimePresetConfig)` in both PrimeNG 21 (shell/mfe1) and
  PrimeNG 19 (mfe2). Change the preset there, not per-app, so both versions stay
  visually identical. Dark mode is driven by `data-theme="dark"` on `<html>`
  (shared `UP_DARK_MODE_SELECTOR`).
- Prefer the project's own classes for layout/spacing (`.up-card`, `.up-table`,
  `.up-section-label`, `--ds-*`/`--up-*` tokens) and let the preset handle the
  component internals. The global `.up-table` class (in each app's `styles.scss`)
  standardizes `p-table` look — reuse it instead of re-styling tables ad hoc.
- New global styles must be added to **all three** `styles.scss` files
  (kept byte-identical) — only the shell's global styles travel into the composed
  page, but each MFE needs its own copy for standalone dev mode.

## Federation gotcha (important)

The PrimeNG theme packages (`@primeuix/themes`, `@primeng/themes`) **must** be in
the Native Federation `skip` list **as regexes** (e.g. `/^@primeuix\/themes/`),
not plain strings. Subpath imports like `@primeng/themes/aura/accordion` break the
import map if these are shared. See `docs/known-issues.md`.

Both PrimeNG versions inject theme CSS into `document.head`; the overlap is
harmless only because both derive from the same Aura base + identical token
values. Overlay-heavy components (Dialog, Select, Menu, Tooltip, Toast) inside
the mfe2 web component use **light DOM** on purpose — see `docs/known-issues.md`
#13 for the overlay-append-target caveat.

## Authoring-template gotcha

A literal `@word` in an Angular template **text node** (e.g. writing
`@loan/bridge` inside `<code>…</code>`) is parsed as an incomplete control-flow
block and fails the build with `NG5002`. Escape the `@` as `&#64;`.

## Components already used in this repo

Table, Select, MultiSelect, RadioButton, IconField, InputText, InputNumber,
Button, Avatar, OverlayBadge, Menu, Tooltip, Chart (doughnut/bar/line), Timeline,
ToggleSwitch, Tag, Dialog, Toast, Accordion, MeterGroup, ProgressBar, Skeleton.
Look at an existing usage of the same component before adding a new one — the
patterns (template refs `#header`/`#body`, `styleClass`, signal-bound `[value]`)
are consistent across the codebase.

## Quick checklist for adding/changing a component

1. Identify the app and its PrimeNG version (table above).
2. `WebFetch` `https://primeng.org/<component>.md` for the current API + template.
3. Find an existing usage in-repo and match its idiom.
4. Add the standalone module to the component's `imports`.
5. Theme via the shared preset / project classes — avoid `::ng-deep` unless
   scoping a component-local override (global table styling already lives in
   `.up-table`).
6. If it's overlay-heavy and lives in mfe2, sanity-check overlay positioning in
   the composed shell, not just standalone.
