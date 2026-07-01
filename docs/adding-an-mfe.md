# Adding / integrating a microfrontend

The shell is fully config-driven, so onboarding an MFE is normally a **config
change only** — no shell code edits, no redeploy of the shell. This guide covers
the common case (add an instance) and the rare case (add a new *kind* of
integration), plus how the platform stays robust as the MFE count grows.

See also: [dynamic-routing.md](dynamic-routing.md) (how routes/nav are built),
[native-federation.md](native-federation.md) (federation mechanics).

---

## 1. Add an MFE instance (config only)

Append one entry to the platform config (the API response; mocked here by
[`shell/public/mfe-config.json`](../shell/public/mfe-config.json)). Pick the
integration kind by how the remote is exposed:

### a) Route-table remote (same Angular major as the shell)

The remote exposes a `Routes` array; the shell mounts it as lazy child routes
(framework is shared). `elementId` is empty.

```jsonc
{
  "elementId": "",
  "appName": "mfe3-billing",
  "displayName": "Billing",
  "businessContext": ["Finance"],
  "routePath": "billing",
  "order": 40,
  "roles": ["admin", "analyst"],
  "mfeConfig": {
    "remoteEntry": "https://billing.example.com/remoteEntry.json",
    "exposeModule": "./routes",
    "moduleName": "BILLING_ROUTES"
  },
  "children": [
    { "displayName": "Invoices", "routePath": "" },
    { "displayName": "Statements", "routePath": "statements" }
  ]
}
```

### b) Web-component remote (different Angular major / framework)

The remote exposes a module that registers a custom element; the shell mounts a
generic host that matches all sub-segments (the remote runs its own router).
Set `elementId` to the custom-element tag; `moduleName` is the registration
export (a promise that's awaited before the element mounts).

```jsonc
{
  "elementId": "mfe4-support",
  "appName": "mfe4-support",
  "displayName": "Support",
  "businessContext": ["Finance"],
  "routePath": "support",
  "order": 50,
  "mfeConfig": {
    "remoteEntry": "https://support.example.com/remoteEntry.json",
    "exposeModule": "./web-component",
    "moduleName": "registered"
  }
}
```

### c) Shell-local page (ships with the shell)

`mfeConfig: null` + a `localComponent` key. The component lives in the shell, so
this is the **one** case that also needs a code touch: register the loader in
[`LOCAL_COMPONENTS`](../shell/src/app/core/mfe-config.ts).

```jsonc
{ "elementId": "", "appName": "shell", "displayName": "Audit Log",
  "businessContext": ["Admin"], "routePath": "admin/audit",
  "mfeConfig": null, "localComponent": "audit" }
```

### Field reference

| Field | Required | Meaning |
|---|---|---|
| `appName` | ✓ | Federation remote name (route-table/web-component). |
| `displayName` | ✓ | Left-nav label. |
| `businessContext` | ✓ | Parent menu group(s); an app may list several. |
| `routePath` | ✓ | Mount path (normalised; collisions are rejected). |
| `elementId` | ✓ (web component) | Custom-element tag; empty for route-table/local. |
| `mfeConfig` | ✓ (remotes) | `remoteEntry` / `exposeModule` / `moduleName`; `null` for local. |
| `roles` | – | Entitlement; absent ⇒ everyone. |
| `order` | – | Nav sort weight (lower first); falls back to config order. |
| `icon` | – | PrimeIcons class for the nav item. |
| `children` | – | Internal routes shown as nav items (route-table remotes). |
| `localComponent` | ✓ (local) | Key into `LOCAL_COMPONENTS`. |

### Checklist

1. Build/deploy the remote with `ng add @angular-architects/native-federation --type remote` and expose `./routes` or `./web-component`.
2. Add the config entry (above). Use a unique `routePath`.
3. If it publishes/consumes bridge data, register its `AppId` + governance policy ([governance.md](governance.md)).
4. Done — routing and nav update on next config load; nothing in the shell changes.

---

## 2. Add a new *kind* of integration (code, but localised)

The three kinds (`routes`, `web-component`, `local`) are
[integration strategies](../shell/src/app/core/integration.ts). To support a new
kind (e.g. an `iframe` host, or an SSR page), you touch exactly two places:

1. add the kind to `MfeKind` and teach `resolveMfeKind()` how to detect it
   ([mfe-config.ts](../shell/src/app/core/mfe-config.ts));
2. implement a `MfeIntegrationStrategy` and register it in
   `INTEGRATION_STRATEGIES` ([integration.ts](../shell/src/app/core/integration.ts)).

`buildRoutes`, `buildNav`, validation, and the registry are all kind-agnostic, so
nothing else changes.

---

## 3. Why this scales and stays robust

- **Isolation.** Each remote loads lazily and independently; a load failure (or
  the [15s timeout](../shell/src/app/core/remote-loader.ts)) is caught and shows
  a per-MFE error page — **one bad MFE never breaks the others or the shell**.
- **Collision-safe.** `validateConfigs` normalises paths and **drops duplicate
  `routePath`s** with a diagnostic, so a bad config entry can't shadow another
  MFE or crash the build of the route table.
- **Deterministic at scale.** `order` gives stable group/item ordering
  regardless of config array order or how many MFEs there are.
- **Entitlement.** `roles` filters the menu/routes per user (server scopes too;
  the shell re-checks as defence-in-depth).
- **Environment-agnostic.** Remote URLs live in `mfeConfig.remoteEntry` (the API
  response), so dev → staging → prod is a config change, not a rebuild.
- **Tested.** The pure builders (`validateConfigs`, `buildNav`, `buildRoutes`,
  `isEntitled`, `resolveMfeKind`) have unit tests ([`*.spec.ts`](../shell/src/app/core))
  — run `npm test` in `shell/`.
