# Native Federation

How runtime composition works in this workspace and how to extend it.

## How it works

Native Federation is Module Federation re-implemented on web standards:
**ES modules + import maps** (polyfilled by `es-module-shims`). There is no
webpack; each app builds with the regular Angular esbuild builder, wrapped by
`@angular-architects/native-federation:build`.

At runtime:

1. The shell boots via [`src/main.ts`](../shell/src/main.ts):
   `initFederation()` is called **host-only** (no manifest, no pre-registered
   remotes) — it processes just the host's own shared-package metadata into the
   import map, then imports `bootstrap.ts` (the real Angular entry).
2. Remotes are discovered **at runtime from an API config**, not a static
   manifest. `loadRemoteModule({ remoteEntry, remoteName, exposedModule })`
   fetches that remote's `remoteEntry.json` on demand, merges its shared-dep
   metadata into the import map, and imports the exposed module like any ES
   module. See [dynamic-routing.md](dynamic-routing.md) for the full design.

```
shell (host)                              mfe1 / mfe2 (remotes)
initFederation()  (host only)
GET mfe-config.json  ──────────────────▶  remoteEntry.json   (fetched lazily,
  [{ routePath, businessContext[],          ├─ exposes: './routes' | './web-component'
     mfeConfig:{ remoteEntry,               └─ shared: [{ packageName, version, singleton… }]
       exposeModule, moduleName }}]
   → buildRoutes() → router.resetConfig()
   → buildNav()    → left navigation
```

## The two integration styles used here

| | MFE1 | MFE2 |
|---|---|---|
| Angular | 21 (same as shell) | 19 (different major) |
| Exposes | `./routes` → lazy route array | `./web-component` → custom element |
| Framework sharing | `@angular/*`, `rxjs`, `primeng` **deduped** via import map | nothing framework-level shared with the shell |
| Coupling | shares the shell's router/injector | DOM tag + `@loan/bridge` only |

Rule of thumb: **same Angular major → expose routes** (cheapest, full
dedupe). **Different major / different framework → expose a web component**
(full isolation, pays its own bundle weight). See
[web-component.md](web-component.md).

## federation.config.js anatomy

```js
module.exports = withNativeFederation({
  name: 'mfe1',
  exposes: { './routes': './src/app/pipeline.routes.ts' },
  shared: { ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }) },
  skip: [
    /^@primeuix\/themes/,   // see known-issues.md #1 — MUST be a regex
    'rxjs/ajax', 'rxjs/fetch', 'rxjs/testing', 'rxjs/webSocket',
  ],
  features: { ignoreUnusedDeps: true },
});
```

- `shareAll` shares every `dependencies` entry of `package.json`, including
  `@loan/bridge` and `@loan/design-tokens` (so shell + mfe1 get one copy).
- **Sharing dedupes only compatible versions.** Angular 19 vs 21 produce two
  isolated copies by design — that is why state can never live in a shared
  Angular service across that boundary (see [bridge.md](bridge.md)).
- `skip` removes a package from sharing → esbuild bundles it into the app.
  Use a **regex** to also catch subpath imports of that package.

## Adding a new remote

**No shell code changes.** Routing and navigation are generated at runtime from
the API config ([dynamic-routing.md](dynamic-routing.md)), so onboarding a remote
is a config edit:

1. `ng new <app>` (any Angular major), `ng add @angular-architects/native-federation --type remote --port 42xx`.
2. Choose the integration style (routes vs web component) per the table above.
3. Add an entry to the platform config (`shell/public/mfe-config.json`, standing
   in for the API): `routePath`, `businessContext[]`, and `mfeConfig`
   (`remoteEntry`, `exposeModule`, `moduleName`). Set `elementId` for a web
   component; add `children[]` to surface a route-table remote's internal routes
   in the left nav.
4. Register the new `AppId` in the bridge contracts and give it explicit
   governance permissions ([governance.md](governance.md)).

The shell has **no** `app.routes.ts` and **no** `federation.manifest.json` — both
were removed in favor of the config-driven route factory.

## Production notes

- The platform config is fetched at runtime → swap per environment by serving a
  different `mfe-config.json` / API response (no rebuild of the shell). Remote
  URLs (`mfeConfig.remoteEntry`) live in that response, so promoting dev → prod
  is a config change.
- Remotes must send CORS headers for the shell's origin (`remoteEntry.json`
  and all chunks).
- `remoteEntry.json` must not be cached aggressively (it carries hashed file
  names); the chunks themselves are immutable and can be cached forever.
- Each app deploys independently — but a **contract change in
  `@loan/bridge` requires publishers and subscribers to be redeployed in a
  compatible order** (the runtime validators tolerate old payload shapes by
  rejecting them, never by crashing).
