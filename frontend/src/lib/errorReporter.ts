import * as Sentry from '@sentry/react';

type ClientErrorContext = Record<string, unknown>;

export const initSentryClient = (dsn: string) => {
    if (!dsn || !dsn.trim()) {
        console.warn('[errorReporter] NEXT_PUBLIC_SENTRY_DSN not configured, error reporting disabled');
        return;
    }

    try {
        Sentry.init({
            dsn,
            environment: process.env.NODE_ENV || 'development',
            tracesSampleRate: 0.05,
        });
    } catch (error) {
        console.error('[errorReporter] Failed to initialize Sentry:', error);
    }
};

export const reportClientError = (error: unknown, context: ClientErrorContext = {}) => {
    const payload = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...context,
    };

    // Sentry integration if available
    if (typeof window !== 'undefined' && window.location) {
        try {
            Sentry.captureException(error, { extra: context });
        } catch (captureError) {
            console.error('[errorReporter] Failed to capture error:', captureError);
        }
    }

    // Fallback: log to console
    console.error('[client_error_reported]', payload);
};
