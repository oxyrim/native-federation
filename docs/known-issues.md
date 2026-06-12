# Known issues & pitfalls — Native Federation × Web Components × PrimeNG

Catalog of every issue this combination ran into (✗ = hit in this repo,
△ = anticipated and designed around). Each entry has the symptom, the cause,
and the fix used here. 18 entries total.

## Native Federation

### 1. ✗ Subpath imports of shared packages break the import map
**Symptom:** `Unable to resolve specifier '@primeuix/themes/aura'` (and later
`'@primeng/themes/aura/accordion'`) — blank page.
**Cause:** `shareAll` puts the package root into the import map, but theme
presets are imported via deep subpaths that have no import-map entry. Skipping
only the root string still leaves discovered subpath entries shared.
**Fix:** skip with a **regex** so the whole family gets bundled instead of
shared: `skip: [/^@primeuix\/themes/]` (and `/^@primeng\/themes/` in mfe2).
Rule of thumb: share only packages whose every used entry point federation
can enumerate; when in doubt, skip-by-regex.

### 2. ✗ Exposed module missing from the TypeScript program
**Symptom:** build error `File 'src/app/web-component.ts' is missing from the
TypeScript compilation`.
**Cause:** Angular's `tsconfig.app.json` lists only `src/main.ts` in `files`;
an exposed module that nothing imports isn't part of the program.
**Fix:** add every exposed entry to `tsconfig.app.json → files`.

### 3. △ No framework dedupe across Angular majors
`@angular/*` 19 and 21 are version-incompatible, so each side ships its own
copy (~bundle cost per remote). This is correct behavior, not a bug — but it
means: no DI, no `NgZone`, no Router instance can be shared across that
boundary. Anything cross-cutting must be framework-agnostic
(see [bridge.md](bridge.md)). Don't try `strictVersion: false` to force it —
you get one Angular copy and runtime explosions.

### 4. △ `singleton: true` is per-compatible-version, not per-tab
A "shared singleton" library still loads once *per incompatible subtree*
(mfe2 has its own `@loan/bridge` copy). Module-level state is therefore NOT a
tab-wide singleton; only an explicit `globalThis` anchor is. The bridge does
exactly that and version-checks at acquire time.

### 5. △ remoteEntry.json caching / CORS in production
Remotes are fetched cross-origin at runtime: serve `remoteEntry.json` with
no/short caching (it points at hashed chunks) and CORS headers for the shell
origin. Forgetting either yields "works locally, blank in prod".

### 6. ✗ Dev-server port collisions
`ng serve` fails with `Port 4202 is already in use` if another workspace
grabbed the port (this repo moved mfe2 to 4203 for that reason). The manifest
must be updated together with the port — they are configured in two places.

### 18. ✗ Stale shared-package cache after editing a local shared library
**Symptom:** after adding exports to `@loan/design-tokens`,
`SyntaxError: The requested module 'blob:…' does not provide an export named
'UP_DARK_MODE_SELECTOR'` — the remote fails to load even though every app
compiles.
**Cause:** Native Federation pre-builds shared npm packages once and caches
the artifacts (`node_modules/.cache/native-federation`). For registry
packages that's fine (version = content), but a `file:`-linked workspace
package can change content without changing version — the cache keeps
serving the old bundle.
**Fix:** after rebuilding a local shared package, clear
`node_modules/.cache/native-federation` (and `.angular/cache`) in every app
and restart the dev servers. Bumping the package version also works and is
the honest signal in CI.

## Web component (Angular elements) specifics

### 7. △ `customElements.define` is once-per-tab
Re-running the exposed module (route re-entry, HMR, two host routes) throws
`NotSupportedError: the name "mfe2-analytics" has already been used`.
**Fix:** memoised registration promise + `customElements.get()` guard, and
the host awaits `mod.registered` (registration is async — creating the
element before it resolves renders an empty unknown element).

### 8. △ Router initial navigation never fires inside a custom element
`createCustomElement` bootstraps components without
`ApplicationRef.bootstrap()`, so the NG19 router stays at its initial state
and deep links render nothing. **Fix:** the root component calls
`router.navigateByUrl(location.pathname + location.search, { replaceUrl: true })`
on every connect — which also repairs stale router state after
detach/re-attach.

### 9. △ Two routers, one URL
Angular routers only observe `popstate`; `pushState` from the *other* router
is invisible. Works here because the shell's matcher consumes all
`/analytics/**` segments and never needs to react to MFE2-internal
navigation. If the shell must react, route through the governed
`navigation/request` channel instead. MFE2 additionally needs a `'**' → noop`
route so foreign URLs don't error while it is alive but hidden.

### 10. △ zone.js leaks through the element boundary
zone.js patches globals (`setTimeout`, `fetch`, `addEventListener`) for the
whole page — a zone-based remote inside a zoneless host changes timing
behavior for everyone. **Fix here:** all three apps zoneless; NG19 uses
`provideExperimentalZonelessChangeDetection()` and `zone.js` was removed from
mfe2's polyfills. If a remote can't go zoneless, the *shell* must load
zone.js exactly once.

### 11. △ Shadow DOM vs theming trade-off
This repo deliberately uses **light DOM**: design tokens cascade in, PrimeNG's
head-injected theme CSS applies, body-appended overlays look right. The cost
is two-way CSS exposure. With `ViewEncapsulation.ShadowDom` you get isolation
but must inject the PrimeNG theme into the shadow root, lose token cascade
(unless re-declared), and body-appended overlays escape the shadow boundary
unstyled. Pick one strategy per remote; light DOM is the pragmatic default
with a design-token system.

## PrimeNG specifics

### 12. ✗/△ Two PrimeNG versions inject theme CSS into one `document.head`
PrimeNG 19 (mfe2) and PrimeNG 21 (shell/mfe1) each inject their own theme
styles targeting the same `.p-*` classes. Mitigated by building **both
presets from one shared config** (`upPrimePresetConfig` in
`@loan/design-tokens`) so the rules agree; the structural CSS differs
slightly between majors but each version's components carry their own
version-scoped structural styles. Residual risk: if the majors' DOM/classes
diverge for a component both sides use, scope mfe2's theme via
`theme.options.cssLayer` or move to shadow DOM (see #11).

### 13. △ Overlays render outside the web component
`p-dialog` (modal), `p-toast`, `p-tooltip`, `p-select` panels attach near
`document.body` / use fixed positioning — i.e. **outside** `<mfe2-analytics>`.
Light DOM + head-injected theme keeps them styled (verified with the
dialog/toast on the Data Quality page). Watch out for: z-index wars with the
shell's own overlays (PrimeNG's zIndex utility counts per PrimeNG copy, the
two copies don't coordinate), and duplicated `p-toast` containers if both
shell and remote render one at the same `position` (this repo uses
`bottom-right` in mfe2 only).

### 14. ✗ chart.js cannot read CSS custom properties
Charts kept light-theme axis/legend colors after switching to dark.
**Fix:** the shell broadcasts the governed retained `ui/theme` channel; chart
components derive colors via `chartTheme(theme)` from `@loan/design-tokens`
and rebuild options through a `computed()` (p-chart re-renders on options
change). Initial value comes from the `<html>` attribute
(`getActiveTheme()`) so a remote that boots before the first publish is still
correct.

### 15. △ Dark mode must switch atomically across PrimeNG copies
Each PrimeNG copy has its own `darkModeSelector` option. If they differ, half
the screen switches. **Fix:** the selector is a constant exported by the
token package (`UP_DARK_MODE_SELECTOR` = `[data-theme="dark"]`), every app
passes it to `providePrimeNG`, and only the shell writes the attribute
(governed `ui/theme` channel keeps JS consumers in sync).

### 16. △ MFE global styles don't travel with the remote
A remote's `styles.scss` is only loaded when it runs standalone — inside the
shell, only **component** styles ship. Anything a remote's markup relies on
globally (`.up-card`, `.up-chip`, tokens, primeicons) must be provided by the
shell. This repo: tokens + utilities + primeicons are shell-global; remotes
use component-scoped styles with token `var(--up-*, fallback)` references.

### 17. △ `@layer` mismatches between PrimeNG majors
Both apps set `cssLayer: false`. If you enable CSS layers, do it for **both**
PrimeNG versions with the same layer order, or unlayered styles (one version)
will always beat layered ones (the other).

## Quick checklist for adding a PrimeNG component inside the WC remote

1. Import the module in the standalone component (per-component, as usual).
2. If it's an overlay: test it **inside the shell**, not just standalone —
   z-index and styling issues only appear in composition.
3. If it draws with canvas/JS (charts, knobs): wire colors through
   `ui/theme` + `chartTheme()`, not CSS vars.
4. If it needs a service (`MessageService`, `ConfirmationService`): provide it
   in the remote's component/provider tree — never expect the shell's copy
   (different PrimeNG major = different injection token identity anyway).
5. Rebuild and check the bundle didn't pull a new shared subpath that the
   import map can't resolve (see #1) — symptom is a blank page with a
   `throwUnresolved` console error.
