import type { MfeFederationConfig } from './mfe-config';

/** A remote that hangs must not hang the shell — cap every load. */
export const REMOTE_LOAD_TIMEOUT_MS = 15_000;

/** Reject `promise` if it does not settle within `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Load an exposed module from a remote, on demand and with a timeout.
 *
 * `loadRemoteModule` is imported dynamically (not at module top-level) so that:
 *  - the federation runtime is only pulled in when a remote is actually
 *    activated (keeps the initial shell bundle lean), and
 *  - pure units that build routes/nav stay free of the federation dependency
 *    and remain trivially unit-testable.
 *
 * The object form `{ remoteEntry, remoteName, exposedModule }` registers the
 * remote on first use, so no manifest / pre-registration is required.
 */
export async function loadExposedModule<T = Record<string, unknown>>(
  appName: string,
  federation: MfeFederationConfig,
  timeoutMs: number = REMOTE_LOAD_TIMEOUT_MS,
): Promise<T> {
  const { loadRemoteModule } = await import('@angular-architects/native-federation');
  return withTimeout(
    loadRemoteModule<T>({
      remoteEntry: federation.remoteEntry,
      remoteName: appName,
      exposedModule: federation.exposeModule,
    }),
    timeoutMs,
    `Loading "${appName}" (${federation.exposeModule})`,
  );
}
