import { logger } from './logger';

type ErrorContext = Record<string, unknown>;

let sentryCaptureException: ((error: unknown, context?: { extra?: ErrorContext }) => void) | null = null;

const getSentryCapture = () => {
    if (sentryCaptureException) return sentryCaptureException;

    const dsn = String(process.env.SENTRY_DSN || '').trim();
    if (!dsn) return null;

    try {
        // Optional runtime integration: works if @sentry/node is installed.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const sentry = require('@sentry/node') as any;
        if (!sentry.__educertnInitialized) {
            sentry.init({ dsn, tracesSampleRate: 0.05 });
            sentry.__educertnInitialized = true;
        }
        sentryCaptureException = sentry.captureException.bind(sentry);
        return sentryCaptureException;
    } catch {
        return null;
    }
};

export const reportServerError = (error: unknown, context: ErrorContext = {}) => {
    const capture = getSentryCapture();

    logger.error('error_reported', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...context,
    });

    if (capture) {
        capture(error, { extra: context });
    }
};
