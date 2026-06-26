# webpack Module Federation vs Native Federation — why the same integration pitfalls appear, vanish, or move

A direct comparison against a sibling project that wired the *same* shape of
system — **Angular 21 shell + Angular 19 MFE-as-web-component + two PrimeNG
majors + shared design tokens** — but with **webpack Module Federation** instead
of **Native Federation** (this repo).

The question this answers: *for each problem hit on webpack, does it exist on
Native Federation, and why?* Short version: the **module-layer** problems
(zone.js, remote-entry format, build tooling) largely **vanish** because Native
Federation shares code through **browser-native ES modules + import maps** rather
than a webpack runtime; the **DOM/CSS-layer** problems (two PrimeNG themes,
design tokens across the boundary) **remain identical** because they live *below*
the bundler; and Native Federation introduces **one new** problem webpack
doesn't have (import-map subpath resolution). See
[primeng-theming.md](primeng-theming.md) for the theming details referenced here.

---

## The root cause of every difference

| | webpack Module Federation | Native Federation (this repo) |
| --- | --- | --- |
| How code is shared | A **webpack runtime "share scope"** — a JS object the container negotiates at load time (singletons, version ranges, `requiredVersion`). | A **W3C import map** + standard ESM. "Shared" = one import-map entry many apps point at; "not shared" = bundled locally (`skip`). |
| Who resolves a bare import | webpack's generated runtime, **after** the container initialises its share scope. | The **browser** (via `es-module-shims`), from the import map installed in `<head>` **before any module executes**. |
| The remote container | `remoteEntry.js` — a webpack-runtime artifact (an ES module here) with `get`/`init`. | `remoteEntry.json` — a **manifest** consumed by `initFederation()`/`loadRemoteModule`; the actual chunks are plain ESM produced by **esbuild**. |
| Build pipeline | `ngx-build-plus` + a custom `webpack.config.js` (Angular's default builder is esbuild now). | The **native esbuild `ApplicationBuilder`** + a `federation.config.js`. |

Almost everything below follows from row 1–2: **webpack mediates sharing at
runtime; Native Federation defers it to the browser at resolve time.** Runtime
mediation is what creates the *timing* and *format* hazards; pushing resolution
into the browser removes them — but makes you responsible for what the import map
can and cannot express (subpaths).

---

## Issue-by-issue

### Issue 1 — Passing design tokens from the shell into the MFE
**webpack:** CSS custom properties on `:root` (cascade into the light-DOM
element) **plus** a token handed across as a web-component `@Input`
(`[props]="{ brandPrimary }"` via `WebComponentWrapper`).

**Native Federation: same problem, exists identically — it is not a bundler
concern.** Design tokens cross the boundary through the **DOM/CSS**, not the
module graph, so the federation technology is irrelevant. This repo uses the same
CSS-cascade channel (one `data-theme` attribute on `<html>` re-resolves
`tokens.css` for both apps — see [primeng-theming.md](primeng-theming.md)). The
only difference is the *explicit* channel: instead of element `@Input`s, this
repo passes live state over the framework-agnostic **`@loan/bridge`** bus (e.g.
the retained `ui/theme` channel). Both are valid; the bridge is preferred here
because it is bidirectional and not coupled to a wrapper component.
→ **Verdict: exists in both. Reason: it's a DOM-layer concern, below federation.**

### Issue 2a — Don't share PrimeNG across the boundary
**webpack:** omit `primeng`/`@primeng/themes` from the `shared` map so each app
bundles its own; the two majors are never reconciled.

**Native Federation: same conclusion, same reason** — Angular 19 and 21 are
incompatible majors, so PrimeNG (which depends on a specific core major) cannot
be a singleton across the boundary. The *expression* differs: webpack = "leave it
out of `shared`"; Native Federation = it's covered by `shareAll` by default, so
you must actively **`skip`** it. In this repo the theme packages are skipped
**by regex** (`/^@primeuix\/themes/`, `/^@primeng\/themes/`).
→ **Verdict: exists in both; advice identical, mechanism (`skip` vs omit) differs.**

> **Native-Federation-only follow-on (webpack does not have this):** the theme
> presets are imported via **deep subpaths** (`@primeuix/themes/aura`,
> `@primeng/themes/aura/<component>`). An **import map only resolves the
> specifiers it lists** — package roots, not arbitrary subpaths — so a *shared*
> theme package yields `Unable to resolve specifier '@primeuix/themes/aura'` and
> a blank page. webpack never hits this because its runtime resolves subpaths
> through the bundle graph, not an import map. This is the deeper reason the
> `skip` must be a **regex** (skip the whole subpath family). See
> [primeng-theming.md §3 Issue A](primeng-theming.md). **The pitfall moved**, it
> didn't disappear.

### Issue 2b — Two PrimeNG themes colliding in one `document.head`
**webpack:** give each PrimeNG its own **token prefix** (`--p-` vs `--pmfe-`) and
its own **CSS `@layer`** so the two themes never write the same variables or
fight over layer order.

**Native Federation: the collision risk is identical — and again it's not a
bundler issue.** Both PrimeNG copies inject a `<style>` of CSS variables into the
same `document.head` regardless of how they were loaded. The two repos pick
**opposite strategies** for the same hazard:
- *webpack repo → isolate:* distinct prefixes + distinct layers.
- *this repo → converge:* the **same** prefix and Aura base, with **identical
  token values** from one shared `upPrimePresetConfig`, so the overlapping
  variables agree and the clash is harmless ([primeng-theming.md §4 Issue D](primeng-theming.md)).

Either works; neither is dictated by webpack-vs-native. Convergence keeps the two
generations pixel-identical (the goal here); prefix/layer isolation is safer if
the two themes must intentionally differ.
→ **Verdict: exists in both. Reason: `document.head` is shared at the DOM level
regardless of the bundler. Fix is a design choice, not a federation feature.**

### Issue 3a — Sharing `zone.js` as a singleton → blank screen
**webpack:** sharing `zone.js` blanks the page because `polyfills.js` imports
`zone.js` **synchronously at startup, before** the Module Federation runtime has
initialised its **share scope** — the shared `zone.js` can't be resolved,
`window.Zone` is never defined, Angular never boots. Fix there: don't federate
the zone.js *library*.

**Native Federation: this specific failure cannot occur, for two independent
reasons.**
1. **No runtime share scope to race against.** Sharing in Native Federation is an
   **import map installed in `<head>` before any module runs** (via
   `es-module-shims`). There is no "initialise the share scope first, then
   resolve shared imports" ordering, so a synchronous early import has nothing to
   out-race. The webpack hazard is intrinsic to *runtime-negotiated* sharing.
2. **This repo is zoneless end-to-end.** Shell, mfe1 and mfe2 all run without
   zones (shell's only polyfill is `es-module-shims`, not `zone.js`; mfe2 uses
   `provideExperimentalZonelessChangeDetection()`). There is no `zone.js` to
   share in the first place.
→ **Verdict: does NOT exist. Reason: import-map sharing has no init-timing race,
and the repo carries no zone.js anyway.**

### Issue 3b — Angular 21 is zoneless; the MFE must run in the shell's NgZone
**webpack:** because the shell was forced **back to zone-based** change detection
and the Angular 19 island had to run change detection in the **same** NgZone,
they shared the shell's `NgZone` via `@angular-architects/module-federation-tools`
`bootstrap({ appType: 'shell' | 'microfrontend' })`.

**Native Federation: does NOT exist, by architecture.**
- **Zoneless removes the requirement.** With no zones, there is no NgZone to
  coordinate; each app drives its own change detection.
- **mfe2 is a genuinely isolated island, not mounted into the shell's runtime.**
  The shell does `loadRemoteModule('mfe2', './web-component')` (side-effect:
  registers the element) and then `document.createElement('mfe2-analytics')`
  ([analytics-host.ts](../shell/src/app/remotes/analytics-host.ts)). The element
  is backed by its **own** Angular 19 application created with
  `createApplication(appConfig)` ([web-component.ts](../mfe2/src/app/web-component.ts)).
  The shell never calls a shared `bootstrap()` and never hands its NgZone across.
  **The DOM element + `@loan/bridge` is the entire contract.**

  Contrast: the webpack repo *also* "exposes a web component," yet still used
  `module-federation-tools` to share the shell's zone — i.e. the MFE was coupled
  to the shell's Angular runtime. Here the coupling is deliberately severed.
→ **Verdict: does NOT exist. Reason: zoneless + a fully self-contained
`createApplication` island instead of a runtime-shared NgZone.**

### Bonus B1 — `remoteEntry.js` is an ES module → must load as `type: 'module'`
**webpack:** the MF plugin emits the container as an ES module; loading it as a
classic `type: 'script'` throws `Cannot read properties of undefined (reading
'init')`, so the wrapper needs `type: 'module'`.

**Native Federation: does NOT exist.** There is no classic-vs-module script
ambiguity: the remote entry is **`remoteEntry.json` (a manifest)** consumed by
`initFederation()` / `loadRemoteModule`, and every emitted chunk is **standard
ESM by construction** (esbuild). There is no `type: 'script' | 'module'` knob in
the API to get wrong.
→ **Verdict: does NOT exist. Reason: ESM-and-manifest by design, not a
webpack-runtime container.**

### Bonus B2 — `ng add` schematic prompt / `ngx-build-plus` friction
**webpack:** `ng add @angular-architects/module-federation` warns that you're on
the esbuild `ApplicationBuilder`, prompts interactively (hangs in non-TTY), and
switches the build to `ngx-build-plus:browser` + a hand-maintained
`webpack.config.js`.

**Native Federation: does NOT exist.** Native Federation is **built for** the
esbuild `ApplicationBuilder` — exactly the thing the webpack schematic complained
about. `ng add @angular-architects/native-federation` produces a small
`federation.config.js`; there is no `ngx-build-plus`, no `webpack.config.js`, and
no "you're on esbuild" guard to fight.
→ **Verdict: does NOT exist. Reason: native to the modern esbuild builder.**

---

## Summary

| webpack MF issue | On Native Federation | Why |
| --- | --- | --- |
| 1. Tokens across the boundary | **Exists (same)** | DOM/CSS cascade + explicit channel — below the module layer. This repo uses `data-theme` + the `@loan/bridge` `ui/theme` channel instead of WC `@Input`s. |
| 2a. Don't share PrimeNG | **Exists (same advice)** | Incompatible Angular majors. Expressed as `skip` (vs omit from `shared`). |
| — theme **subpath** resolution | **New, NF-only** | Import maps resolve listed specifiers, not arbitrary subpaths → must `skip` theme packages **by regex**. |
| 2b. Two themes in one `<head>` | **Exists (same)** | Shared `document.head` is bundler-independent. webpack isolates (`--p-`/`--pmfe-` + layers); this repo converges (identical tokens from one preset). |
| 3a. Shared zone.js → blank | **Gone** | No runtime share-scope init race (import maps resolve pre-execution); and the repo is zoneless. |
| 3b. Share the shell's NgZone | **Gone** | Zoneless + mfe2 is a self-contained `createApplication` island, not bootstrapped into the shell's runtime. |
| B1. `remoteEntry.js` `type:'module'` | **Gone** | Remote entry is a JSON manifest; chunks are ESM by construction. |
| B2. `ngx-build-plus` schematic | **Gone** | Native Federation targets the esbuild `ApplicationBuilder` directly. |

**The throughline:** webpack Module Federation reconciles modules **at runtime**,
which is powerful (fine-grained singletons/version ranges) but couples you to its
runtime's **timing** (3a), its **container format** (B1), and its **build
plugin** (B2) — and those are exactly the problems that disappear under Native
Federation, which leans on **browser-native ESM + import maps resolved before
execution**. What does **not** change is anything living **below** the module
layer — two PrimeNG themes in one `document.head`, design tokens riding the CSS
cascade into a light-DOM web component — because no federation technology can
abstract away the single shared document. The cost of going native is a new,
narrower concern: the import map only resolves what it lists, so deep subpath
imports (the PrimeNG theme presets) must be bundled via `skip`.
