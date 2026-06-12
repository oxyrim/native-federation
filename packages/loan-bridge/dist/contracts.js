/**
 * =====================================================================
 * SHARED DATA CONTRACTS
 * =====================================================================
 * This file is the single source of truth for WHAT data may cross a
 * microfrontend boundary. If a type is not declared here, it cannot be
 * published on the bus — neither at compile time (the ChannelMap keys
 * are a closed union) nor at runtime (the governance registry rejects
 * unregistered channels).
 *
 * The library is intentionally framework-agnostic: no Angular, no RxJS,
 * no DOM-framework imports. Plain TypeScript + plain functions only,
 * so an Angular 21 shell, an Angular 19 web component, or even a React
 * remote can all consume the very same singleton instance.
 * =====================================================================
 */
export {};
