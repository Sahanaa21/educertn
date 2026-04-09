import { logger } from './logger';

type ErrorContext = Record<string, unknown>;

let sentryClient: any = null;

const initSentry = () => {
    if (sentryClient) return sentryClient;

    const dsn = String(process.env.SENTRY_DSN || '').trim();
    if (!dsn) return null;

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Sentry = require('@sentry/node') as any;
        Sentry.init({
            dsn,
            tracesSampleRate: parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE || '0.05'),
            environment: process.env.NODE_ENV || 'development',
            integrations: [
                new Sentry.Integrations.Http({ tracing: true }),
                new Sentry.Integrations.OnUncaughtException(),
                new Sentry.Integrations.OnUnhandledRejection(),
            ],
        });
        sentryClient = Sentry;
        return sentryClient;
    } catch (error) {
        logger.warn('sentry_init_failed', {
            message: error instanceof Error ? error.message : 'Could not initialize Sentry',
        });
        return null;
    }
};

export const initSentryServer = () => {
    return initSentry();
};

export const reportServerError = (error: unknown, context: ErrorContext = {}) => {
    const sentry = sentryClient || initSentry();

    logger.error('error_reported', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...context,
    });

    if (sentry && typeof sentry.captureException === 'function') {
        try {
            sentry.captureException(error, { extra: context });
        } catch (captureError) {
            logger.warn('sentry_capture_failed', {
                message: captureError instanceof Error ? captureError.message : 'Unknown capture error',
            });
        }
    }
};
