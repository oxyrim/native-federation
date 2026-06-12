# @loan/bridge — cross-MFE communication

Framework-agnostic, strictly typed, governed pub/sub. Source:
[`packages/loan-bridge/src`](../packages/loan-bridge/src).

## Why not an Angular service?

| Approach | What actually happens |
|---|---|
| `@Injectable({providedIn:'root'})` shared via federation | One instance **per Angular platform**. The shell+MFE1 platform and MFE2's `createApplication` platform each get their own → state silently diverges. |
| Module-level state in an Angular library | `@angular/core` cannot be deduped across majors 19↔21, so each bundle ships its own copy of the library module → again two states. |
| RxJS `Subject` in a shared lib | Works only while every consumer resolves the *same* `rxjs` copy — breaks the moment a remote pins another version, and couples the contract to RxJS. |
| **`globalThis` anchor (chosen)** | One instance per browser tab, independent of framework, framework version, bundler, or build pipeline. |

```ts
const GLOBAL_KEY = Symbol.for('loan.unified-platform.bridge');
// first bundle to load creates the bus, everyone else acquires it;
// a major-version mismatch between bundles throws loudly at connect time.
```

## API

```ts
import { connectToBridge } from '@loan/bridge';

const client = connectToBridge('mfe2-analytics');      // AppId is a closed union

client.publish('pipeline/selection', payload);          // typed by ChannelMap
const unsub = client.subscribe('pipeline/summary', s => …);
client.current('session/user');                         // last retained value
await client.waitFor('pipeline/summary', 5000);         // promise w/ timeout
client.auditLog();                                      // snapshot
client.subscribeAudit(entry => …);                      // live feed
client.dispose();                                       // releases ALL handlers of this client
```

Semantics:

- **Retained channels** replay the last value to late subscribers (state
  semantics); non-retained channels are fire-and-forget commands/events.
- Payloads are **deep-frozen** before delivery — a consumer cannot mutate
  another MFE's data.
- A throwing handler is logged and isolated; it never breaks the publisher
  or sibling subscribers.
- Payloads must be **JSON-safe** (ISO strings, no class instances, no
  functions) so they survive any bundle/realm boundary.
- `dispose()` must be called from framework teardown when a client is owned
  by a destroyable scope. (In this POC the three adapter services are
  app-singletons, so they live as long as the tab.)

## Angular adapters

Each app wraps the client in a thin service that maps bus events to signals —
framework ergonomics stay per-app, the contract stays neutral:

- shell: [`ShellBridgeService`](../shell/src/app/core/bridge.service.ts) — owns `session/user`, `ui/theme`, executes `navigation/request`.
- mfe1: [`PipelineBridgeService`](../mfe1/src/app/core/bridge.service.ts) + [`LoansService`](../mfe1/src/app/core/loans.service.ts) — publishes summary/selection via `effect()`.
- mfe2: [`AnalyticsBridgeService`](../mfe2/src/app/core/bridge.service.ts) — consumes everything, may publish only `navigation/request`.

All three adapters also subscribe to `notifications/broadcast` into a
`messages` signal and expose `notify(message, level)`, used by the
"Cross-App Messaging" widgets on *Commitment Pipeline*, *Settings* and
*Reports & Analytics → Activity* — a live, worked example of all three
communication directions (mfe→mfe, shell→mfe, mfe→shell) over the same bus.

## Versioning & evolution

- `LoanBridge.VERSION` (semver). At acquire time a **major** mismatch between
  already-loaded and loading bundles throws — two incompatible contracts must
  never silently coexist.
- Adding a channel or an optional field = minor bump. Removing/renaming =
  major bump, coordinate deployment.
- Runtime validators (see [governance.md](governance.md)) are the safety net
  when a remote was built against an older contract: bad payloads are
  rejected at the boundary with a `GovernanceViolationError`, they never
  reach subscribers.

## Adding a channel (checklist)

1. Define the payload interface + add it to `ChannelMap`
   ([contracts.ts](../packages/loan-bridge/src/contracts.ts)). Compile fails
   until step 2 is done.
2. Register the policy: owner, allow-lists, retention, validator
   ([governance.ts](../packages/loan-bridge/src/governance.ts)).
3. `npm run build:packages` (apps consume the package via symlink).
4. Document it in the governance table ([governance.md](governance.md)).

Step 1+2 live in one reviewed package — that review IS the governance gate
for new cross-MFE data flows.
