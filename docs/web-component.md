# MFE2 as a Web Component

How an **Angular 19** application runs inside an **Angular 21** shell with
zero framework sharing.

## Bootstrap chain

Exposed module: [`mfe2/src/app/web-component.ts`](../mfe2/src/app/web-component.ts)

```ts
const appRef = await createApplication(appConfig);          // private NG19 platform
const element = createCustomElement(AppComponent, { injector: appRef.injector });
customElements.define('mfe2-analytics', element);            // once per tab
```

Host side: [`shell/src/app/remotes/analytics-host.ts`](../shell/src/app/remotes/analytics-host.ts)

```ts
const mod = await loadRemoteModule('mfe2', './web-component');
await mod.registered;                       // registration is async!
host.appendChild(document.createElement('mfe2-analytics'));
```

Key decisions, each of which prevents a real failure mode:

1. **`createApplication`, not `bootstrapApplication`** — there is no second
   `<app-root>` to claim; the application exists only as an injector + a
   custom element factory.
2. **Registration is idempotent** (`customElements.get()` guard + memoised
   promise). `customElements.define` throws on double registration; route
   re-entry or HMR would crash otherwise.
3. **The host awaits `mod.registered`** before creating the element —
   otherwise the element upgrades later and briefly renders nothing.
4. **One long-lived `ApplicationRef`** is reused across attach/detach cycles;
   the component instance inside the element is created per connect.

## Routing inside the element

Two routers share one URL: the shell's (Angular 21) and MFE2's (Angular 19).
This works because of three measures:

- The shell matches `/analytics/**` with a `UrlMatcher` that **consumes all
  segments** ([`app.routes.ts`](../shell/src/app/app.routes.ts)) — the shell
  doesn't care what is behind the prefix, so MFE2 owns its sub-tree.
- MFE2's route table claims `path: 'analytics'` and adds a `'**' → Noop`
  wildcard so foreign URLs (e.g. `/pipeline`) never error while the NG19
  router is alive but hidden.
- `createCustomElement` **never fires the router's initial navigation** (no
  `ApplicationRef.bootstrap()` happens). The root component therefore resyncs
  on every connect:

```ts
ngOnInit() {
  this.router.navigateByUrl(location.pathname + location.search, { replaceUrl: true });
}
```

Known limitation (accepted): Angular routers only react to `popstate`.
`router.navigate()` inside MFE2 uses `pushState`, which the shell's router
does not observe — harmless here because the shell's matcher keeps matching
any `/analytics/...` URL. If the shell ever needed to react, MFE2 would have
to publish a governed `navigation/request` instead of navigating itself.

## Styling strategy: light DOM, not shadow DOM

The element intentionally does **not** use shadow DOM:

- design tokens (`--up-*` on `:root`) cascade into the remote's markup,
- PrimeNG 19's runtime-injected theme CSS (a `<style>` in `document.head`)
  can reach the component,
- overlays (dialog/toast/tooltip) that PrimeNG appends near `document.body`
  are styled consistently.

The cost: shell global CSS can leak in (and the remote's `:host`-scoped
styles keep things from leaking out). With shadow DOM all four points above
invert — you would need to inject the theme into the shadow root and re-think
overlays. See [known-issues.md](known-issues.md) #4/#5.

## Change detection

All three apps are zoneless (`provideExperimentalZonelessChangeDetection()`
in NG19). The remote must not import `zone.js`: it would monkey-patch
`setTimeout`/`fetch`/DOM events **globally**, affecting the host. If a remote
genuinely needs zones, load zone.js in the SHELL (one copy, before any
remote) — never from inside a remote.

## Lifecycle & cleanup

- The host removes the element on route leave (`ngOnDestroy`); Angular
  elements destroy the inner component on `disconnectedCallback`.
- The `ApplicationRef` itself stays alive (warm re-entry). If a real
  teardown is ever needed, call `appRef.destroy()` and drop the memoised
  promise — and call `client.dispose()` on the bridge to release handlers.
