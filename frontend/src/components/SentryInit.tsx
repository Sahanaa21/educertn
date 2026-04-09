'use client';

import { useEffect } from 'react';
import { initSentryClient } from '@/lib/errorReporter';

export default function SentryInit() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (dsn) {
      initSentryClient(dsn);
    }
  }, []);

  return null;
}
