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
/* ============================== raw tokens ============================== */
export const upTokens = {
    sidebarBg: '#1b2739',
    sidebarBgActive: 'rgba(59, 130, 246, 0.15)',
    sidebarText: '#8fa4b8',
    sidebarSection: '#4d6578',
    brandAccent: '#2563eb',
    primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
        950: '#172554',
    },
    statusReady: '#166534',
    statusReadyBg: '#f0fdf4',
    statusWarn: '#92400e',
    statusWarnBg: '#fffbeb',
    statusError: '#991b1b',
    statusErrorBg: '#fef2f2',
    surfacePage: '#f1f4f8',
    surfaceCard: '#ffffff',
    border: '#e2e8f0',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    chart: ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#0ea5e9'],
};
/** Dark-scheme values that differ from the light set (mirror of tokens.css). */
export const upDarkTokens = {
    surfacePage: '#0f172a',
    surfaceCard: '#1e293b',
    border: '#334155',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    statusReady: '#4ade80',
    statusWarn: '#fbbf24',
    statusError: '#f87171',
};
/** Attribute on <html> that drives tokens.css AND both PrimeNG dark modes. */
export const UP_THEME_ATTRIBUTE = 'data-theme';
/** Pass this to providePrimeNG → theme.options.darkModeSelector in EVERY app. */
export const UP_DARK_MODE_SELECTOR = `[${UP_THEME_ATTRIBUTE}="dark"]`;
const STORAGE_KEY = 'up.theme';
export function getStoredTheme() {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === 'dark' || v === 'light' ? v : null;
    }
    catch {
        return null;
    }
}
export function getSystemTheme() {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}
export function getActiveTheme() {
    return document.documentElement.getAttribute(UP_THEME_ATTRIBUTE) === 'dark' ? 'dark' : 'light';
}
/** Sets the attribute (cascades to tokens + both PrimeNG versions) and persists. */
export function applyTheme(theme) {
    document.documentElement.setAttribute(UP_THEME_ATTRIBUTE, theme);
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    }
    catch {
        /* storage unavailable (private mode etc.) — theme still applies */
    }
    return theme;
}
/** Resolve stored → system preference and apply it. Call once at startup. */
export function initTheme() {
    return applyTheme(getStoredTheme() ?? getSystemTheme());
}
/** Notifies when the OS scheme changes (only relevant if user never chose). */
export function watchSystemTheme(onChange) {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => onChange(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
}
/* ====================== shared PrimeNG preset config ===================== */
/**
 * ONE preset definition consumed by both PrimeNG generations:
 *   - shell/mfe1: definePreset(Aura, upPrimePresetConfig)  // @primeuix/themes
 *   - mfe2:       definePreset(Aura, upPrimePresetConfig)  // @primeng/themes
 *
 * Verbatim copy of the `UnifiedTheme` preset from poc/mfe-ds
 * (shell/src/app/app.config.ts) — aligns PrimeNG's design tokens with the
 * Unified Platform design system, light AND dark color schemes.
 */
export const upPrimePresetConfig = {
    primitive: {
        borderRadius: {
            none: '0',
            xs: '4px',
            sm: '4px',
            md: '6px',
            lg: '8px',
            xl: '12px',
        },
    },
    semantic: {
        primary: {
            50: '{blue.50}',
            100: '{blue.100}',
            200: '{blue.200}',
            300: '{blue.300}',
            400: '{blue.400}',
            500: '{blue.500}',
            600: '{blue.600}',
            700: '{blue.700}',
            800: '{blue.800}',
            900: '{blue.900}',
            950: '{blue.950}',
        },
        colorScheme: {
            light: {
                primary: {
                    color: '{blue.600}',
                    contrastColor: '#ffffff',
                    hoverColor: '{blue.700}',
                    activeColor: '{blue.800}',
                },
                highlight: {
                    background: '{blue.50}',
                    focusBackground: '{blue.100}',
                    color: '{blue.700}',
                    focusColor: '{blue.800}',
                },
                surface: {
                    0: '#ffffff',
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },
            },
            dark: {
                primary: {
                    color: '{blue.400}',
                    contrastColor: '{surface.0}',
                    hoverColor: '{blue.300}',
                    activeColor: '{blue.200}',
                },
                highlight: {
                    background: 'rgba(59, 130, 246, 0.16)',
                    focusBackground: 'rgba(59, 130, 246, 0.24)',
                    color: '{blue.300}',
                    focusColor: '{blue.200}',
                },
                surface: {
                    0: '#f1f5f9', /* text.color — primary text (near white) */
                    50: '#e2e8f0',
                    100: '#cbd5e1',
                    200: '#94a3b8', /* secondary text / muted */
                    300: '#94a3b8',
                    400: '#64748b', /* placeholder / icon / mutedColor */
                    500: '#475569',
                    600: '#334155', /* input borders */
                    700: '#334155', /* content borders */
                    800: '#253047', /* hover backgrounds  ← content.hoverBackground */
                    900: '#1e293b', /* component backgrounds ← content.background */
                    950: '#0f172a', /* deepest / form field background ← formField.background */
                },
            },
        },
    },
};
/** Colors for chart.js, which cannot read CSS custom properties by itself. */
export function chartTheme(theme) {
    return theme === 'dark'
        ? {
            palette: upTokens.chart,
            text: upDarkTokens.textSecondary,
            grid: 'rgba(241, 245, 249, 0.08)',
            surface: upDarkTokens.surfaceCard,
        }
        : {
            palette: upTokens.chart,
            text: upTokens.textSecondary,
            grid: 'rgba(15, 23, 42, 0.08)',
            surface: upTokens.surfaceCard,
        };
}
