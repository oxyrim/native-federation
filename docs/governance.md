# Data-sharing Governance

What data may cross a microfrontend boundary, who may move it, and how the
rules are enforced. Source: [`governance.ts`](../packages/loan-bridge/src/governance.ts).

## The model

Every channel is declared with a `ChannelPolicy`:

| Field | Meaning |
|---|---|
| `owner` | Team/app owning the contract — appears in errors and audits. |
| `allowedPublishers` | Closed list of `AppId`s that may `publish`. |
| `allowedSubscribers` | Closed list or `'*'`. |
| `retained` | Whether late subscribers get the last value (state vs event). |
| `validate(payload)` | Structural runtime check at the boundary. |

Enforcement happens **twice**:

1. **Compile time.** `publish`/`subscribe` are generic over
   `keyof ChannelMap` — an undeclared channel or a wrong payload shape does
   not compile in any consuming app.
2. **Runtime.** Unknown channel, denied publisher/subscriber, or a payload
   failing its validator throws a typed `GovernanceViolationError` *and*
   writes a `denied` entry to the audit log. This catches what the compiler
   cannot: remotes built against an older contract, or untyped callers.

## Current rules

| Channel | Payload | Publishers | Subscribers | Retained | Owner |
|---|---|---|---|---|---|
| `pipeline/summary` | `PipelineSummaryUpdated` | mfe1 | `*` | yes | mfe1 |
| `pipeline/selection` | `LoanSelectionChanged` | mfe1 | `*` | yes | mfe1 |
| `pricing/refresh` | `PricingRefreshRequested` | shell, mfe1 | shell, mfe1 | no | shell |
| `session/user` | `UserContextChanged` | shell | `*` | yes | shell |
| `navigation/request` | `NavigationRequested` | mfe1, mfe2 | shell | no | shell |
| `ui/theme` | `ThemePreferenceChanged` | shell | `*` | yes | shell |
| `notifications/broadcast` | `BroadcastNotification` | shell, mfe1, mfe2 | `*` | no | shell |

Design intents encoded in this table:

- **Analytics is read-only on business data** — mfe2 may not publish
  pricing commands; try it live under *Reports & Analytics → Reports*.
- **The shell owns cross-cutting state** (session, theme, URL). MFEs *ask*
  (`navigation/request`) instead of acting.
- **Producers own their contracts** — pipeline data contracts belong to the
  pipeline team (mfe1).
- **`notifications/broadcast` is the odd one out, deliberately** — an
  any-to-any, unretained channel any app may publish or subscribe to. It
  exists purely to demonstrate the three communication directions
  (mfe→mfe, shell→mfe, mfe→shell) via the "Cross-App Messaging" widgets on
  *Commitment Pipeline* (mfe1), *Settings* (shell) and
  *Reports & Analytics → Activity* (mfe2).

## Audit

Every `publish`, `subscribe` and `denied` is recorded (ring buffer of 500)
with timestamp, app, channel and detail. Snapshot via `client.auditLog()`,
live feed via `client.subscribeAudit(cb)` — the governance panel in MFE2
renders this feed in real time.

## Violation handling

`GovernanceViolationError` carries `appId`, `channel` and a
`kind` (`publish-denied` | `subscribe-denied` | `invalid-payload` |
`unknown-channel`). Publishers should treat it as a programming error
(fail fast in dev, report in prod) — it is never a transient condition.

## Process

The registry and the contracts live in **one package**
(`packages/loan-bridge`) so that *every* new cross-MFE data flow is a code
review on that package — there is no API to register a channel at runtime,
deliberately.
