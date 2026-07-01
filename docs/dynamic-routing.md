# Config-driven routing & navigation

The shell contains **no hardcoded routes, no remote registrations, and no nav
menu**. Both the Angular route table and the left navigation are generated at
runtime from a single API response, so adding / removing / re-pathing a
microfrontend is a config change — never a shell code change.

## The config ("API" response)

Served (in this POC) from [`shell/public/mfe-config.json`](../shell/public/mfe-config.json);
typed by [`MfeRouteConfig`](../shell/src/app/core/mfe-config.ts). One array, one
entry per app:

```ts
interface MfeRouteConfig {
  elementId: string;            // non-empty ⇒ web-component remote; "" ⇒ route-table remote
  appName: string;              // federation remote name
  displayName: string;          // left-nav label
  businessContext: string[];    // parent menu group(s) — an app can sit under several
  routePath: string;            // Angular route path (e.g. "pipeline", "admin/users")
  roles?: string[];             // PROPOSED: roles allowed to see this app (absent/empty ⇒ everyone)
  icon?: string;                // PROPOSED: optional PrimeIcons class for the nav item
  mfeConfig: {                  // null ⇒ shell-local page (see localComponent)
    remoteEntry: string;        // URL of the remote's remoteEntry.json
    exposeModule: string;       // exposed key, e.g. "./routes" or "./web-component"
    moduleName: string;         // export to use from that module (Routes array, or registration promise)
  } | null;
  localComponent?: string;      // PROPOSED: key into shell's LOCAL_COMPONENTS when mfeConfig is null
  children?: { displayName: string; routePath: string; icon?: string }[]; // PROPOSED: internal routes for the nav
}
```

### Proposed additions to the original contract

The brief's schema was extended (backward-compatibly) in three places, each
marked `PROPOSED` above:

- **`children[]`** — *Requirement 4.* A route-table remote (e.g. mfe1, which owns
  `/pipeline/**`) has internal routes that should appear as their own left-nav
  items but carry no separate MFE config. `children` lists them as nav-only
  entries; `routePath` is **relative** to the parent (`""` = the parent's index).
  The remote still owns the actual routing — these never generate routes.
- **`mfeConfig: null` + `localComponent`** — lets shell-owned pages (Users,
  Settings) flow through the *same* config-driven pipeline instead of being
  hardcoded. The component code necessarily lives in the shell (keyed in
  [`LOCAL_COMPONENTS`](../shell/src/app/core/mfe-config.ts)), but its path and
  menu placement are config-driven. Adding a *remote* needs no registry change.
- **`roles[]`** — entitlement gate. The config API is expected to scope by
  identity server-side; the shell re-checks `roles` client-side (`isEntitled`)
  as defence-in-depth. Absent/empty ⇒ visible to everyone.
- **`icon`** — purely cosmetic nav icon; falls back to a generic icon.

## Runtime flow

```
main.ts            initFederation()                 // host only — no remotes pre-registered
  │
bootstrap (DI)     provideRouter([], withDisabledInitialNavigation())
  │                provideAppInitializer(() => PlatformBootstrapService.start())
  │
PlatformBootstrapService.start()        // production-shaped, dependent sequence
  ├─ 1. GET user.json                  → UserApiService          (who is the user?)
  ├─ 2. bridge.setUser(user)           → publish session/user    (MFEs get context)
  ├─ 3. GET mfe-config.json?userId&role&org   → MfeConfigApiService  (config FOR that user)
  │        → validateConfigs()  → filter isEntitled(role)  → registry.configs signal
  ├─ 4. buildRoutes(configs)           → router.resetConfig(...)  (core/route-factory.ts)
  └─ 5. router.initialNavigation()                                (first nav runs only now)

App component      sections = registry.navGroups   // computed signal → buildNav(configs)
```

The two API calls are **dependent and sequential**: the user is fetched first,
and the user's `userId` / `role` / `org` are passed to the config call
(`GET /api/platform-config?userId=…&role=…&org=…`). The server is expected to
scope the config to that identity; the shell additionally enforces `roles[]`
client-side (`isEntitled`) as defence-in-depth. Changing the user's role changes
which apps appear — e.g. a `trader` does not see the `admin`-gated Admin group.

Key pieces:

- [`core/api/user-api.service.ts`](../shell/src/app/core/api/user-api.service.ts) — `GET user.json` → the current user.
- [`core/api/mfe-config-api.service.ts`](../shell/src/app/core/api/mfe-config-api.service.ts) — `GET mfe-config.json` with the user as query params.
- [`core/platform-bootstrap.service.ts`](../shell/src/app/core/platform-bootstrap.service.ts) — orchestrates the user → config → routes sequence.
- [`core/mfe-config.ts`](../shell/src/app/core/mfe-config.ts) — types,
  `validateConfigs()` (normalises paths, drops route-collisions), `isEntitled()`,
  `resolveMfeKind()`, `LOCAL_COMPONENTS`.
- [`core/integration.ts`](../shell/src/app/core/integration.ts) — one
  `MfeIntegrationStrategy` per kind (`routes` / `web-component` / `local`) +
  registry. **Add a new kind here** (see [adding-an-mfe.md](adding-an-mfe.md)).
- [`core/remote-loader.ts`](../shell/src/app/core/remote-loader.ts) —
  `loadExposedModule()` with a 15s timeout; isolates a slow/dead remote.
- [`core/route-factory.ts`](../shell/src/app/core/route-factory.ts) —
  `buildRoutes()` delegates each config to its strategy, adds redirects.
- [`core/nav.ts`](../shell/src/app/core/nav.ts) — `buildNav()` groups configs by
  `businessContext`.
- [`core/mfe-registry.service.ts`](../shell/src/app/core/mfe-registry.service.ts)
  — calls the config API, filters by role, owns `configs`/`navGroups` signals,
  `loadFor(user)` + `reload(user)`.

### Why `withDisabledInitialNavigation`

`provideRouter` would normally run the first navigation during bootstrap — but
the route table is empty at that point. We **defer** initial navigation, build
the routes in the app initializer, then call `router.initialNavigation()`. This
guarantees the first URL resolves against the generated routes.

## How each config becomes a route

| Config shape | Generated route | Lazy load |
|---|---|---|
| `elementId: ""` (route-table remote) | `{ path: routePath, loadChildren }` | `loadRemoteModule({ remoteEntry, remoteName, exposedModule })` → `module[moduleName]` (a `Routes` array) |
| `elementId: "tag"` (web-component remote) | `{ matcher: startsWith(routePath), loadComponent: RemoteWebComponentHost, data: { mfe } }` | host runs `loadRemoteModule(...)`, awaits the registration promise (`moduleName`), then mounts `<tag>` |
| `mfeConfig: null` (shell-local) | `{ path: routePath, loadComponent: LOCAL_COMPONENTS[localComponent] }` | local dynamic `import()` |

Plus a generated `'' → firstRoutePath` redirect and a `**` catch-all. Everything
is `loadChildren`/`loadComponent`, so **a remote is fetched only when its route
is activated** — the config fetch at startup is just metadata.

## Navigation generation

`buildNav()`:
1. collects every unique `businessContext` value (first-seen order) → one group
   each (**deduped**, so apps sharing a context don't create duplicate parents);
2. places each config under **every** context it lists;
3. expands a config with `children` into one nav item per child (the `""` child
   is the parent's index, matched `exact`); a config without children yields a
   single item.

Because `navGroups` is a `computed` over the `configs` signal, the menu updates
automatically whenever the config changes.

## Error handling

- **Invalid entries** are dropped by `validateConfigs()` with a `console.error`
  explaining why — one bad MFE can't break the whole shell.
- **Remote route load failure** → the `loadChildren` catch returns a route that
  renders [`RemoteErrorPage`](../shell/src/app/pages/remote-error-page.ts)
  instead of crashing navigation.
- **Web-component load failure** → the generic host shows an inline error card.
- **Config fetch failure / empty / not-entitled** → `MfeRegistryService.loadError`
  is set and the `**` route renders `RemoteErrorPage`.
- **User lookup failure** → `PlatformBootstrapService.start()` catches it, calls
  `registry.setFatal(...)`, applies an error-only route table and still runs
  `initialNavigation()`, so the user sees an error page rather than a blank
  screen (never a half-booted app).

## Updating config at runtime

`MfeRegistryService.reload(user)` re-fetches the config, rebuilds the route table
(`router.resetConfig`) and updates the nav (reactively, via the signal) — no full
page reload. Wire it to a poll/websocket/refresh button to pick up config changes
live.
