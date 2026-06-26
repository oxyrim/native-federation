# PrimeNG theming under Module Federation + Web Components

How PrimeNG's theme actually works, why it breaks the moment you put it behind
Native Federation, and exactly how it's made to work across **two PrimeNG
majors in one browser tab** — PrimeNG 21 (shell + mfe1, Angular 21) and PrimeNG
19 (mfe2, Angular 19, shipped as a `<mfe2-analytics>` web component).

This is the narrative companion to the terse catalog in
[known-issues.md](known-issues.md) (entries #1, #11–#17). For how these same
pitfalls compare to a **webpack Module Federation** setup — which ones vanish,
which stay identical, and why — see
[webpack-vs-native-federation.md](webpack-vs-native-federation.md).

---

## 1. How PrimeNG theming works (v17+ "styled mode")

Modern PrimeNG (v17 onward, both 19 and 21 here) does **not** ship a static
theme CSS file you link. Instead:

1. You build a **preset** by extending a base preset (Aura) with token
   overrides:

   ```ts
   // shell/src/app/theme/up-preset.ts  (v21 → @primeuix/themes)
   // mfe2/src/app/theme/up-preset.ts   (v19 → @primeng/themes)
   import { definePreset } from '@primeuix/themes';      // v19: '@primeng/themes'
   import Aura from '@primeuix/themes/aura';              // v19: '@primeng/themes/aura'
   import { upPrimePresetConfig } from '@loan/design-tokens';

   export const UpPreset = definePreset(Aura, upPrimePresetConfig);
   ```

2. You register it once per Angular application:

   ```ts
   // */app.config.ts
   providePrimeNG({
     ripple: true,
     theme: {
       preset: UpPreset,
       options: { darkModeSelector: UP_DARK_MODE_SELECTOR, cssLayer: false },
     },
   })
   ```

3. **At runtime**, PrimeNG's theme service turns the preset into a big block of
   **CSS custom properties** (`--p-*`, e.g. `--p-primary-color`,
   `--p-content-background`) and injects a `<style>` element into
   **`document.head`**. Every PrimeNG component is authored against those
   variables. Change a token → change the variable → every component restyles.

Key options:

- **`darkModeSelector`** — the CSS selector under which the preset's *dark*
  `colorScheme` token values take effect. Default is `system`/`.p-dark`. Here it
  is `[data-theme="dark"]` (see [`UP_DARK_MODE_SELECTOR`](../packages/design-tokens/src/index.ts)).
  PrimeNG emits both the light token block and a `[data-theme="dark"] { … }`
  block; flipping the attribute on `<html>` swaps which one wins — **no
  re-injection, no rebuild**.
- **`cssLayer`** — whether PrimeNG wraps its rules in an `@layer`. Set to
  `false` in every app here (see issue F).

The critical mental model: **theming is runtime-injected CSS variables in
`document.head`, scoped by a selector on `<html>`.** Everything below follows
from that.

---

## 2. Where it lives in this repo

| Concern | File |
| --- | --- |
| Shared preset token overrides (light + dark colorScheme) | [`upPrimePresetConfig`](../packages/design-tokens/src/index.ts) |
| Dark-mode selector constant (`[data-theme="dark"]`) | [`UP_DARK_MODE_SELECTOR`](../packages/design-tokens/src/index.ts) |
| v21 preset | [`shell/src/app/theme/up-preset.ts`](../shell/src/app/theme/up-preset.ts), `mfe1/.../up-preset.ts` |
| v19 preset | [`mfe2/src/app/theme/up-preset.ts`](../mfe2/src/app/theme/up-preset.ts) |
| `providePrimeNG(...)` | each app's `app.config.ts` |
| Theme toggle (writes the attribute, broadcasts `ui/theme`) | shell topbar → [`ShellBridgeService`](../shell/src/app/core/bridge.service.ts) |
| Web-component bootstrap | [`mfe2/src/app/web-component.ts`](../mfe2/src/app/web-component.ts) |
| Theme packages skipped from sharing | each `federation.config.js` |

---

## 3. The Module Federation issues

### Issue A — Theme subpath imports break the import map → blank page

**Symptom:** at runtime the app dies with
`Unable to resolve specifier '@primeuix/themes/aura'` (or, in mfe2,
`'@primeng/themes/aura/accordion'`), and you get a blank page.

**Cause:** `shareAll()` registers package **roots** in the Native Federation
import map (`@primeuix/themes` → one URL). But presets are imported via **deep
subpaths** — `@primeuix/themes/aura`, `@primeng/themes/aura/<component>` — and
those subpaths have **no import-map entry**. The browser's ES module resolver
can't find them, so the chunk fails to load. `shareAll` cannot enumerate every
subpath a theme package might expose, so this is structural, not a config typo.

**Fix:** don't share the theme packages — **bundle** them into each app by
skipping them with a **regex** (so the whole family, all subpaths, is excluded):

```js
// shell/mfe1 federation.config.js
skip: [ /^@primeuix\/themes/, … ]
// mfe2 federation.config.js
skip: [ /^@primeng\/themes/, … ]
```

A plain string (`'@primeuix/themes'`) only skips the exact root — subpaths
would still try to resolve. **Skip by regex.**

> Same class of bug, same fix, for the CSS-only `primeflex` utility lib: it has
> no JS entry point, so it must be `skip`ped too (it's loaded via `angular.json`
> styles, not imported in JS).

### Issue B — You cannot *share* PrimeNG across the Angular 19 ↔ 21 boundary

Even setting subpaths aside, sharing PrimeNG as a singleton is wrong here.
PrimeNG 19 depends on `@angular/core` 19; PrimeNG 21 on core 21. Native
Federation only dedupes a shared lib across **version-compatible** ranges, and
Angular majors 19 and 21 are not compatible — so each app **must** carry its own
PrimeNG + its own theme runtime. That's the whole point of shipping mfe2 as a
web component: the two PrimeNG generations coexist instead of fighting over one
shared copy. Bundling the theme packages (Issue A) is exactly what makes this
possible.

---

## 4. The Web Component (Angular 19 + PrimeNG 19) issues

mfe2 is bootstrapped **not** with `bootstrapApplication`, but as a custom
element:

```ts
// mfe2/src/app/web-component.ts
const appRef = await createApplication(appConfig);     // private Angular 19 platform
const el = createCustomElement(AppComponent, { injector: appRef.injector });
customElements.define('mfe2-analytics', el);
```

`appConfig` contains `providePrimeNG(...)`, so PrimeNG 19's theme service runs in
**the element's own injector** and injects its `<style>` into `document.head`
the first time the element is created. From there, four things can go wrong.

### Issue C — Shadow DOM would leave every PrimeNG component unstyled

PrimeNG's theme is injected into `document.head`. CSS in the document head
**does not cross a shadow boundary**. So if `AppComponent` used
`encapsulation: ViewEncapsulation.ShadowDom`, the head-injected `--p-*`
variables and component CSS would never reach the components rendered inside the
shadow root → unstyled PrimeNG, broken layout.

**Fix / decision:** mfe2 stays in **light DOM** (default emulated encapsulation;
no ShadowDom). The head-injected theme cascades into the element's content
normally, design tokens cascade in, and body-appended overlays (see Issue F)
look right. The trade-off is no style isolation — accepted deliberately. (If you
ever need isolation, you'd have to inject the PrimeNG theme into the shadow root
and re-declare token variables there — see [known-issues.md #11](known-issues.md).)

### Issue D — Two PrimeNG copies inject theme variables into one `document.head`

Both PrimeNG 19 (mfe2) and PrimeNG 21 (shell/mfe1) inject a theme `<style>` into
the **same** `document.head`, and both use the **same CSS-variable namespace**
(`--p-*`). Whichever initializes can set/overwrite shared variables — a recipe
for one MFE restyling another.

**Fix:** both presets are built from **one shared config object**,
[`upPrimePresetConfig`](../packages/design-tokens/src/index.ts), including the
full light *and* dark `colorScheme`. Because the token **values** are identical,
the two injected blocks agree — the overlap is harmless even though the
structural CSS each PrimeNG major emits differs. Keep that single source of
truth; if the two majors' tokens ever diverge for a shared component, scope
mfe2's theme with `cssLayer` or move to shadow DOM.

### Issue E — Dark mode only half-switches

Each PrimeNG copy reads its **own** `darkModeSelector`. If shell used `.p-dark`
and mfe2 used `[data-theme="dark"]` (or vice versa), toggling the theme would
flip one PrimeNG generation and not the other — half the page goes dark.

**Fix:** the selector is defined **once** in the shared token package
(`UP_DARK_MODE_SELECTOR = '[data-theme="dark"]'`) and every app passes the same
value to `providePrimeNG`. Only the **shell** writes the attribute on `<html>`
(via the theme toggle). Because all PrimeNG copies + `tokens.css` key off the
same `<html>[data-theme="dark"]`, one attribute write switches **everything
atomically** — both PrimeNG majors and the raw CSS variables — with no
re-injection.

### Issue F — Two follow-ons that look like theming bugs

- **chart.js ignores the theme.** Canvas charts can't read CSS variables, so
  they keep light-mode axis/legend colors after switching to dark. **Fix:** the
  shell broadcasts the **retained, governed `ui/theme` bridge channel**; chart
  components derive colors from `chartTheme(theme)` in `@loan/design-tokens` and
  re-render. (A retained channel means a remote that boots *after* the toggle
  still gets the current theme.) See [bridge.md](bridge.md).
- **`cssLayer` must match across majors.** Both apps set `cssLayer: false`. If
  you turn CSS layers on, do it for **both** PrimeNG versions with the same
  layer order — otherwise one version's layered styles lose specificity battles
  against the other's unlayered styles. See [known-issues.md #17](known-issues.md).
- **Overlays** (dialog, select panel, menu, toast) append to `document.body`,
  i.e. *outside* the element. Light DOM + head-injected theme keeps them styled;
  this is why the overlay-heavy components deliberately live in mfe2 (a
  stress-test). See [known-issues.md #13](known-issues.md).

---

## 5. Putting it together — the working setup

```
@loan/design-tokens (framework-agnostic, no Angular)
├─ upPrimePresetConfig   ── one preset definition (light + dark colorScheme)
└─ UP_DARK_MODE_SELECTOR ── '[data-theme="dark"]'
        │
        ├── shell  (v21): definePreset(Aura@primeuix, cfg) → providePrimeNG({…darkModeSelector})
        ├── mfe1   (v21): definePreset(Aura@primeuix, cfg) → providePrimeNG({…darkModeSelector})
        └── mfe2   (v19): definePreset(Aura@primeng,  cfg) → providePrimeNG({…darkModeSelector})
                          bootstrapped via createApplication + createCustomElement (light DOM)

federation.config.js (every app):  skip: [/^@primeuix\/themes/ | /^@primeng\/themes/, 'primeflex', …]
runtime:  shell toggle → <html data-theme="dark"> → all PrimeNG copies + tokens.css flip together
                                                  → ui/theme bridge channel → chart.js recolors
```

### Checklist when this breaks

1. **Blank page, "Unable to resolve specifier …/themes/aura"** → theme package
   not skipped, or skipped by string instead of regex. Use `skip: [/^@primeuix\/themes/]`.
2. **PrimeNG components unstyled inside the web component** → you're in Shadow
   DOM; head-injected theme can't reach the shadow root. Use light DOM.
3. **Dark mode flips only part of the page** → `darkModeSelector` differs
   between PrimeNG copies. Share one selector; write the attribute once on `<html>`.
4. **One MFE restyles another** → the two presets' token values diverged. Build
   both from the one shared `upPrimePresetConfig`.
5. **Charts stay light after toggle** → canvas can't read CSS vars; drive them
   from the `ui/theme` channel via `chartTheme()`.
6. **After editing the shared token package, changes don't show** → clear
   `node_modules/.cache/native-federation` + `.angular/cache` and rebuild
   (`npm run build:packages`). See [known-issues.md #18](known-issues.md).
