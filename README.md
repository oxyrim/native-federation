# Unified Platform — Angular Native Federation POC

A loan-pipeline platform composed of three independently built and deployed
frontends, federated at runtime with
[`@angular-architects/native-federation`](https://www.npmjs.com/package/@angular-architects/native-federation):

| App       | Framework      | Federation role | Integration style                       | Port |
| --------- | -------------- | --------------- | ---------------------------------------- | ---- |
| **shell** | Angular **21** | dynamic host    | owns layout, routing, session            | 4200 |
| **mfe1**  | Angular **21** | remote          | exposed **route table** (`./routes`)     | 4201 |
| **mfe2**  | Angular **19** | remote          | exposed **web component** (`<mfe2-analytics>`) | 4203 |

Plus two framework-agnostic packages:

| Package                | Purpose                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `packages/loan-bridge` | strictly typed, **governed** cross-MFE communication bus (no Angular, no RxJS) |
| `packages/design-tokens` | light/dark design tokens (CSS custom properties), theme runtime, shared PrimeNG preset config, chart.js palette |

## Documentation

| Doc | Contents |
| --- | -------- |
| [docs/native-federation.md](docs/native-federation.md) | how runtime composition works, config anatomy, adding remotes, production notes |
| [docs/web-component.md](docs/web-component.md) | the Angular 19 element: bootstrap chain, dual-router strategy, light-DOM styling, lifecycle |
| [docs/bridge.md](docs/bridge.md) | bridge API, why an Angular singleton can't work, adapters, versioning, adding channels |
| [docs/governance.md](docs/governance.md) | policy model, current rules, audit, violation handling |
| [docs/known-issues.md](docs/known-issues.md) | **18 pitfalls of Native Federation × Web Components × PrimeNG** — each with symptom, cause, fix |

## Running

```bash
# one-time: build the shared packages (already pre-built in this repo)
npm run build:packages

# start everything (or run start:mfe1 / start:mfe2 / start:shell in 3 terminals)
npm start
```

Open **http://localhost:4200**.

- `/pipeline`, `/pipeline/commitments`, `/pipeline/pricing`, `/pipeline/loans/:id` → MFE1 (Angular 21)
- `/analytics`, `/analytics/reports`, `/analytics/activity` → MFE2 (Angular 19 web component)
- `/admin/users`, `/admin/settings` → shell-local pages

Each MFE also runs standalone: http://localhost:4201 and http://localhost:4203.

## Architecture

```
┌────────────────────────────  browser tab  ───────────────────────────┐
│  shell (Angular 21, zoneless, host)                                  │
│  ├─ /pipeline/**  → loadRemoteModule('mfe1','./routes')              │
│  │                  ordinary lazy routes — Angular 21 is SHARED      │
│  ├─ /analytics/** → loadRemoteModule('mfe2','./web-component')       │
│  │                  <mfe2-analytics> custom element — Angular 19     │
│  │                  bundled privately, NOTHING framework-level shared│
│  └─ /admin/**     → shell-local pages                                │
│                                                                      │
│  globalThis[Symbol.for('loan.unified-platform.bridge')]              │
│  └─ ONE LoanBridge instance — used by all three apps                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Internal routing

- **MFE1** exposes its route table; the shell mounts it under `/pipeline`.
  Deep links (`/pipeline/loans/SL-78912345`) work because the route tree is
  composed at runtime.
- **MFE2** runs **its own Angular 19 Router** inside the web component. The
  shell matches `/analytics/**` with a custom `UrlMatcher` that consumes all
  segments; MFE2's router interprets the full URL itself. On every
  (re)connect the root component re-syncs its router with `location.pathname`
  because a custom element created via `createCustomElement` never triggers
  the router's initial navigation.

## Requirement 4 — can an Angular singleton service be the communication layer?

**No — not across this web-component boundary.** Three independent reasons:

1. **Two injector trees.** The shell/MFE1 run on one Angular platform, MFE2
   (`createApplication` inside the web component) on another. An
   `@Injectable({ providedIn: 'root' })` service is a singleton *per
   platform*, so shell and MFE2 would each get their **own instance** — two
   "singletons" holding different state.
2. **`@angular/core` cannot be shared across majors.** Native Federation
   dedupes shared packages via the import map, but Angular 21 and Angular 19
   are not version-compatible, so each bundle ships its own `@angular/core`.
   Even module-level state inside an Angular library would be duplicated.
3. **Coupling.** An Angular-typed API (Observables of one RxJS copy, DI
   tokens of one core copy) leaks framework internals across a boundary whose
   whole point is framework isolation — it would also block a future React or
   Vue remote.

**Therefore the communication library is framework-agnostic:**
`@loan/bridge` is plain TypeScript (zero dependencies). The singleton is
anchored at `globalThis[Symbol.for('loan.unified-platform.bridge')]` with a
version handshake, so *every* bundle — regardless of framework, framework
version, or build pipeline — acquires the same instance. Each Angular app
wraps it in a thin local adapter service (`ShellBridgeService`,
`PipelineBridgeService`, `AnalyticsBridgeService`) that maps bus events to
signals, which is the correct place for framework ergonomics.

## Requirement 5 — strict typing & governance

`packages/loan-bridge/src/contracts.ts` declares a **closed channel map**:

```ts
interface ChannelMap {
  'pipeline/summary':       PipelineSummaryUpdated;
  'pipeline/selection':     LoanSelectionChanged;
  'pricing/refresh':        PricingRefreshRequested;
  'session/user':           UserContextChanged;
  'navigation/request':     NavigationRequested;
  'ui/theme':                ThemePreferenceChanged;
  'notifications/broadcast': BroadcastNotification;
}
```

- **Compile time** — `publish`/`subscribe` are generic over
  `keyof ChannelMap`: publishing an undeclared channel or a wrong payload
  shape does not compile. Adding a channel requires editing the contracts
  file → a natural code-review governance gate.
- **Runtime** — `governance.ts` registers a policy per channel: owner,
  `allowedPublishers`, `allowedSubscribers`, retention, and a structural
  validator (defence against remotes built with an older contract).
  Violations throw a typed `GovernanceViolationError` and are recorded in an
  audit log (visible under **Reports & Analytics → Reports**, which also has
  a button that demonstrates a *denied* publish).
- **Immutability** — payloads are deep-frozen before delivery; no MFE can
  mutate state owned by another.
- Payloads are JSON-safe by contract (ISO strings, no class instances), so
  they survive any realm/bundle boundary.

### Governance rules in this POC

| Channel              | Publishers        | Subscribers   | Retained |
| -------------------- | ----------------- | ------------- | -------- |
| `pipeline/summary`   | mfe1              | everyone      | yes      |
| `pipeline/selection` | mfe1              | everyone      | yes      |
| `pricing/refresh`    | shell, mfe1       | shell, mfe1   | no       |
| `session/user`       | shell             | everyone      | yes      |
| `navigation/request` | mfe1, mfe2        | shell         | no       |
| `ui/theme`           | shell             | everyone      | yes      |
| `notifications/broadcast` | shell, mfe1, mfe2 | everyone  | no       |

## Cross-app messaging demo

`notifications/broadcast` is an any-to-any, unretained channel that every
app can both publish and subscribe to. Each of the three apps has a
"Cross-App Messaging" widget wired to it:

| App  | Page                                  |
| ---- | ------------------------------------- |
| shell | Settings (`/admin/settings`)         |
| mfe1  | Commitment Pipeline (`/pipeline/commitments`) |
| mfe2  | Reports & Analytics → Activity (`/analytics/activity`) |

Sending a message from any one of these widgets demonstrates all three
communication directions live: it lands in the other MFE's feed
(**mfe → mfe**), in the shell's feed (**mfe → shell**), and a message sent
from the shell reaches both MFEs (**shell → mfe**).

## Demo data is live, not static

- **Commitment Pipeline** is backed by a stateful `CommitmentsService`:
  "New Commitment" opens a form dialog, "Propose from Selection" derives a
  commitment from loans selected in the Loan Pipeline, and each row's
  status can be advanced Open → Pending → Fulfilled.
- **Pricing Results** has a working "Re-run Pricing" button that re-prices
  every loan with a small jitter, publishes the change over
  `pricing/refresh`, and shows the resulting delta vs. the previous average
  and a "Just now" freshness indicator on updated rows.

## Design tokens & theming

`packages/design-tokens` ships:

- `tokens.css` — the Unified Platform design system tokens (`--ds-*`, ported
  from poc/mfe-ds): light on `:root`, dark overrides on `[data-theme="dark"]`,
  plus `--up-*` compatibility aliases; loaded once per app via `angular.json`;
- `design-system.css` — the DS utility/component classes (`.ds-btn`,
  `.ds-card`, `.ds-badge-*`, `.ds-table`, spacing/typography helpers);
- a theme runtime (`initTheme`, `applyTheme`, `getActiveTheme`,
  `watchSystemTheme`) — storage + `prefers-color-scheme` aware;
- `upPrimePresetConfig` — ONE preset definition consumed by
  `definePreset(Aura, …)` in both PrimeNG 21 (shell/mfe1) and PrimeNG 19
  (mfe2), including the dark `colorScheme`;
- `chartTheme(theme)` — chart.js colors (canvas cannot read CSS vars).

**Light/dark flow:** the shell owns the switch (topbar moon/sun). It sets
`data-theme` on `<html>` — which atomically flips the custom tokens AND
both PrimeNG versions (same `UP_DARK_MODE_SELECTOR` everywhere) — and
broadcasts the retained, governed `ui/theme` channel so JS-drawn surfaces
(charts in MFE2) restyle live across the web-component boundary.

## PrimeNG

- shell & mfe1: **PrimeNG 21** (+ `@primeuix/themes`)
- mfe2: **PrimeNG 19** (+ `@primeng/themes`)

Components used: Table (selection, paginator, sorting, scroll), Select,
MultiSelect, RadioButton, IconField, Button, Avatar, OverlayBadge, Menu,
Tooltip, Chart (doughnut/bar/line), Timeline, ToggleSwitch, Tag, Dialog,
Toast, Accordion, MeterGroup, ProgressBar, Skeleton — the overlay-heavy ones
live in MFE2 on purpose, to exercise PrimeNG overlays inside a web component
(see [docs/known-issues.md](docs/known-issues.md) #13).

### Known caveat (documented on purpose)

Both PrimeNG versions inject their theme CSS into `document.head` (the web
component intentionally uses light DOM so design tokens cascade). Because
both presets derive from the same Aura base + identical token values, the
overlap is visually harmless — but if the two versions ever diverge, scope
MFE2's theme with a CSS layer or move the WC to shadow DOM and inject the
theme into the shadow root.

## Zone strategy

All three apps are **zoneless** (Angular 21 default; MFE2 uses
`provideExperimentalZonelessChangeDetection()`), so the Angular 19 remote
never loads zone.js into the shared page and never monkey-patches globals
under the Angular 21 shell.
