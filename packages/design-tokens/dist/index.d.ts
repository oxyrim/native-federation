/**
 * Typed mirror of tokens.css + theme runtime.
 *
 * Theme ported from the Unified Platform design system (poc/mfe-ds):
 * slate/blue palette, light + dark schemes, `data-theme` attribute.
 *
 * Framework-agnostic on purpose: the shell (Angular 21), MFE1 (Angular 21)
 * and MFE2 (Angular 19 web component) all consume the SAME theme state, so
 * none of it may depend on a framework instance.
 */
export declare const upTokens: {
    readonly sidebarBg: "#1b2739";
    readonly sidebarBgActive: "rgba(59, 130, 246, 0.15)";
    readonly sidebarText: "#8fa4b8";
    readonly sidebarSection: "#4d6578";
    readonly brandAccent: "#2563eb";
    readonly primary: {
        readonly 50: "#eff6ff";
        readonly 100: "#dbeafe";
        readonly 200: "#bfdbfe";
        readonly 300: "#93c5fd";
        readonly 400: "#60a5fa";
        readonly 500: "#3b82f6";
        readonly 600: "#2563eb";
        readonly 700: "#1d4ed8";
        readonly 800: "#1e40af";
        readonly 900: "#1e3a8a";
        readonly 950: "#172554";
    };
    readonly statusReady: "#166534";
    readonly statusReadyBg: "#f0fdf4";
    readonly statusWarn: "#92400e";
    readonly statusWarnBg: "#fffbeb";
    readonly statusError: "#991b1b";
    readonly statusErrorBg: "#fef2f2";
    readonly surfacePage: "#f1f4f8";
    readonly surfaceCard: "#ffffff";
    readonly border: "#e2e8f0";
    readonly textPrimary: "#0f172a";
    readonly textSecondary: "#475569";
    readonly textMuted: "#94a3b8";
    readonly fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    readonly chart: readonly ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#0ea5e9"];
};
export type UpTokens = typeof upTokens;
/** Dark-scheme values that differ from the light set (mirror of tokens.css). */
export declare const upDarkTokens: {
    readonly surfacePage: "#0f172a";
    readonly surfaceCard: "#1e293b";
    readonly border: "#334155";
    readonly textPrimary: "#f1f5f9";
    readonly textSecondary: "#94a3b8";
    readonly textMuted: "#64748b";
    readonly statusReady: "#4ade80";
    readonly statusWarn: "#fbbf24";
    readonly statusError: "#f87171";
};
export type UpTheme = 'light' | 'dark';
/** Attribute on <html> that drives tokens.css AND both PrimeNG dark modes. */
export declare const UP_THEME_ATTRIBUTE = "data-theme";
/** Pass this to providePrimeNG → theme.options.darkModeSelector in EVERY app. */
export declare const UP_DARK_MODE_SELECTOR = "[data-theme=\"dark\"]";
export declare function getStoredTheme(): UpTheme | null;
export declare function getSystemTheme(): UpTheme;
export declare function getActiveTheme(): UpTheme;
/** Sets the attribute (cascades to tokens + both PrimeNG versions) and persists. */
export declare function applyTheme(theme: UpTheme): UpTheme;
/** Resolve stored → system preference and apply it. Call once at startup. */
export declare function initTheme(): UpTheme;
/** Notifies when the OS scheme changes (only relevant if user never chose). */
export declare function watchSystemTheme(onChange: (theme: UpTheme) => void): () => void;
/**
 * ONE preset definition consumed by both PrimeNG generations:
 *   - shell/mfe1: definePreset(Aura, upPrimePresetConfig)  // @primeuix/themes
 *   - mfe2:       definePreset(Aura, upPrimePresetConfig)  // @primeng/themes
 *
 * Verbatim copy of the `UnifiedTheme` preset from poc/mfe-ds
 * (shell/src/app/app.config.ts) — aligns PrimeNG's design tokens with the
 * Unified Platform design system, light AND dark color schemes.
 */
export declare const upPrimePresetConfig: {
    readonly primitive: {
        readonly borderRadius: {
            readonly none: "0";
            readonly xs: "4px";
            readonly sm: "4px";
            readonly md: "6px";
            readonly lg: "8px";
            readonly xl: "12px";
        };
    };
    readonly semantic: {
        readonly primary: {
            readonly 50: "{blue.50}";
            readonly 100: "{blue.100}";
            readonly 200: "{blue.200}";
            readonly 300: "{blue.300}";
            readonly 400: "{blue.400}";
            readonly 500: "{blue.500}";
            readonly 600: "{blue.600}";
            readonly 700: "{blue.700}";
            readonly 800: "{blue.800}";
            readonly 900: "{blue.900}";
            readonly 950: "{blue.950}";
        };
        readonly colorScheme: {
            readonly light: {
                readonly primary: {
                    readonly color: "{blue.600}";
                    readonly contrastColor: "#ffffff";
                    readonly hoverColor: "{blue.700}";
                    readonly activeColor: "{blue.800}";
                };
                readonly highlight: {
                    readonly background: "{blue.50}";
                    readonly focusBackground: "{blue.100}";
                    readonly color: "{blue.700}";
                    readonly focusColor: "{blue.800}";
                };
                readonly surface: {
                    readonly 0: "#ffffff";
                    readonly 50: "#f8fafc";
                    readonly 100: "#f1f5f9";
                    readonly 200: "#e2e8f0";
                    readonly 300: "#cbd5e1";
                    readonly 400: "#94a3b8";
                    readonly 500: "#64748b";
                    readonly 600: "#475569";
                    readonly 700: "#334155";
                    readonly 800: "#1e293b";
                    readonly 900: "#0f172a";
                    readonly 950: "#020617";
                };
            };
            readonly dark: {
                readonly primary: {
                    readonly color: "{blue.400}";
                    readonly contrastColor: "{surface.0}";
                    readonly hoverColor: "{blue.300}";
                    readonly activeColor: "{blue.200}";
                };
                readonly highlight: {
                    readonly background: "rgba(59, 130, 246, 0.16)";
                    readonly focusBackground: "rgba(59, 130, 246, 0.24)";
                    readonly color: "{blue.300}";
                    readonly focusColor: "{blue.200}";
                };
                readonly surface: {
                    readonly 0: "#f1f5f9";
                    readonly 50: "#e2e8f0";
                    readonly 100: "#cbd5e1";
                    readonly 200: "#94a3b8";
                    readonly 300: "#94a3b8";
                    readonly 400: "#64748b";
                    readonly 500: "#475569";
                    readonly 600: "#334155";
                    readonly 700: "#334155";
                    readonly 800: "#253047";
                    readonly 900: "#1e293b";
                    readonly 950: "#0f172a";
                };
            };
        };
    };
};
export interface UpChartTheme {
    /** Series palette (theme-independent, chosen to work on both schemes). */
    palette: readonly string[];
    /** Axis/legend label color. */
    text: string;
    /** Grid-line color. */
    grid: string;
    /** Tooltip / card background. */
    surface: string;
}
/** Colors for chart.js, which cannot read CSS custom properties by itself. */
export declare function chartTheme(theme: UpTheme): UpChartTheme;
