# Native Federation

How runtime composition works in this workspace and how to extend it.

## How it works

Native Federation is Module Federation re-implemented on web standards:
**ES modules + import maps** (polyfilled by `es-module-shims`). There is no
webpack; each app builds with the regular Angular esbuild builder, wrapped by
`@angular-architects/native-federation:build`.

At runtime:

1. The shell boots via [`src/main.ts`](../shell/src/main.ts):
   `initFederation('federation.manifest.json')` fetches every remote's
   `remoteEntry.json`, merges the **shared package metadata** into one import
   map, then imports `bootstrap.ts` (the real Angular entry).
2. `loadRemoteModule('<remote>', './<exposed>')` resolves an exposed module
   through that import map and imports it like any ES module.

```
shell (host)                         mfe1 / mfe2 (remotes)
federation.manifest.json   ──────▶   remoteEntry.json
  { "mfe1": "http://localhost:4201/remoteEntry.json",     ├─ exposes: './routes' | './web-component'
    "mfe2": "http://localhost:4203/remoteEntry.json" }    └─ shared: [{ packageName, version, singleton… }]
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

1. `ng new <app>` (any Angular major), `ng add @angular-architects/native-federation --type remote --port 42xx`.
2. Choose the integration style (routes vs web component) per the table above.
3. Add the remote to [`shell/public/federation.manifest.json`](../shell/public/federation.manifest.json).
4. Add a route in [`shell/src/app/app.routes.ts`](../shell/src/app/app.routes.ts)
   (`loadChildren` + `loadRemoteModule`, or the `startsWith()` matcher + host
   component for a web component).
5. Register the new `AppId` in the bridge contracts and give it explicit
   governance permissions ([governance.md](governance.md)).

## Production notes

- The manifest is fetched at runtime → swap per environment by deploying a
  different `federation.manifest.json` (no rebuild of the shell).
- Remotes must send CORS headers for the shell's origin (`remoteEntry.json`
  and all chunks).
- `remoteEntry.json` must not be cached aggressively (it carries hashed file
  names); the chunks themselves are immutable and can be cached forever.
- Each app deploys independently — but a **contract change in
  `@loan/bridge` requires publishers and subscribers to be redeployed in a
  compatible order** (the runtime validators tolerate old payload shapes by
  rejecting them, never by crashing).
