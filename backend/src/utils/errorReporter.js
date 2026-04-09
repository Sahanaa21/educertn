"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportServerError = void 0;
const logger_1 = require("./logger");
let sentryCaptureException = null;
const getSentryCapture = () => {
    if (sentryCaptureException)
        return sentryCaptureException;
    const dsn = String(process.env.SENTRY_DSN || '').trim();
    if (!dsn)
        return null;
    try {
        // Optional runtime integration: works if @sentry/node is installed.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const sentry = require('@sentry/node');
        if (!sentry.__educertnInitialized) {
            sentry.init({ dsn, tracesSampleRate: 0.05 });
            sentry.__educertnInitialized = true;
        }
        sentryCaptureException = sentry.captureException.bind(sentry);
        return sentryCaptureException;
    }
    catch (_a) {
        return null;
    }
};
const reportServerError = (error, context = {}) => {
    const capture = getSentryCapture();
    logger_1.logger.error('error_reported', Object.assign({ message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, context));
    if (capture) {
        capture(error, { extra: context });
    }
};
exports.reportServerError = reportServerError;
