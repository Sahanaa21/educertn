type ClientErrorContext = Record<string, unknown>;

const getSentryCapture = () => {
    if (typeof window === 'undefined') return null;
    const sentry = (window as any).Sentry;
    if (sentry && typeof sentry.captureException === 'function') {
        return sentry.captureException.bind(sentry);
    }
    return null;
};

export const reportClientError = (error: unknown, context: ClientErrorContext = {}) => {
    const capture = getSentryCapture();
    const payload = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...context,
    };

    if (capture) {
        capture(error, { extra: context });
        return;
    }

    // Fallback reporter for environments without Sentry integration.
    console.error('[client_error_reported]', payload);
};
