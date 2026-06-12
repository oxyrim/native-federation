const isString = (v) => typeof v === 'string';
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isNumberOrNull = (v) => v === null || isNumber(v);
const isStringArray = (v) => Array.isArray(v) && v.every(isString);
const isObject = (v) => typeof v === 'object' && v !== null;
export const CHANNEL_POLICIES = {
    'pipeline/summary': {
        owner: 'mfe1-pipeline',
        description: 'Aggregated loan-pipeline KPIs (totals, UPB, status breakdown).',
        allowedPublishers: ['mfe1-pipeline'],
        allowedSubscribers: '*',
        retained: true,
        validate: (p) => isObject(p) &&
            isNumber(p['totalLoans']) &&
            isNumber(p['totalUpb']) &&
            isNumber(p['readyForPricing']) &&
            isNumber(p['readyUpb']) &&
            isNumber(p['missingData']) &&
            isNumber(p['missingUpb']) &&
            isNumber(p['ineligible']) &&
            isNumber(p['fromDesktopUnderwriter']) &&
            isNumber(p['importedByUser']) &&
            isString(p['asOf']),
    },
    'pipeline/selection': {
        owner: 'mfe1-pipeline',
        description: 'Currently selected loans in the pipeline grid.',
        allowedPublishers: ['mfe1-pipeline'],
        allowedSubscribers: '*',
        retained: true,
        validate: (p) => isObject(p) &&
            isStringArray(p['selectedLoanIds']) &&
            isNumber(p['totalSelectedUpb']) &&
            isString(p['asOf']),
    },
    'pricing/refresh': {
        owner: 'shell',
        description: 'Command: re-price the given loans. Analytics may NOT trigger pricing.',
        allowedPublishers: ['shell', 'mfe1-pipeline'],
        allowedSubscribers: ['shell', 'mfe1-pipeline'],
        retained: false,
        validate: (p) => isObject(p) &&
            isStringArray(p['loanIds']) &&
            isString(p['requestedBy']) &&
            (p['reason'] === 'manual' ||
                p['reason'] === 'stale-data' ||
                p['reason'] === 'commitment-proposal'),
    },
    'session/user': {
        owner: 'shell',
        description: 'Authenticated user context. Only the shell owns the session.',
        allowedPublishers: ['shell'],
        allowedSubscribers: '*',
        retained: true,
        validate: (p) => isObject(p) &&
            isString(p['userId']) &&
            isString(p['displayName']) &&
            isString(p['initials']) &&
            (p['role'] === 'trader' || p['role'] === 'analyst' || p['role'] === 'admin') &&
            isString(p['organization']),
    },
    'navigation/request': {
        owner: 'shell',
        description: 'Ask the shell to navigate to an app-level route.',
        allowedPublishers: ['mfe1-pipeline', 'mfe2-analytics'],
        allowedSubscribers: ['shell'],
        retained: false,
        validate: (p) => isObject(p) && isString(p['path']) && isString(p['requestedBy']),
    },
    'ui/theme': {
        owner: 'shell',
        description: 'Active color scheme. Only the shell owns the theme switch.',
        allowedPublishers: ['shell'],
        allowedSubscribers: '*',
        retained: true,
        validate: (p) => isObject(p) &&
            (p['theme'] === 'light' || p['theme'] === 'dark') &&
            isString(p['setBy']) &&
            isString(p['asOf']),
    },
    'notifications/broadcast': {
        owner: 'shell',
        description: 'Ad-hoc cross-app message. Any app may publish or subscribe — used to demonstrate ' +
            'mfe-to-mfe, shell-to-mfe, and mfe-to-shell delivery over the shared bus.',
        allowedPublishers: ['shell', 'mfe1-pipeline', 'mfe2-analytics'],
        allowedSubscribers: '*',
        retained: false,
        validate: (p) => isObject(p) &&
            isString(p['id']) &&
            isString(p['from']) &&
            isString(p['message']) &&
            (p['level'] === 'info' || p['level'] === 'success' || p['level'] === 'warning') &&
            isString(p['asOf']),
    },
};
/** Raised whenever a publish/subscribe violates the registry. */
export class GovernanceViolationError extends Error {
    constructor(appId, channel, kind, detail) {
        super(`[loan-bridge] ${kind} — app "${appId}" on channel "${channel}": ${detail}`);
        this.appId = appId;
        this.channel = channel;
        this.kind = kind;
        this.name = 'GovernanceViolationError';
    }
}
