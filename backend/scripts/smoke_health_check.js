/*
  Lightweight health smoke check for cron or CI.
  Usage:
    HEALTH_BASE_URL=https://api.example.com node scripts/smoke_health_check.js
*/

const HEALTH_BASE_URL = String(process.env.HEALTH_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS || 6000);

const withTimeout = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } finally {
    clearTimeout(timer);
  }
};

const run = async () => {
  const liveUrl = `${HEALTH_BASE_URL}/api/health/live`;
  const readyUrl = `${HEALTH_BASE_URL}/api/health/ready`;

  const [live, ready] = await Promise.all([withTimeout(liveUrl), withTimeout(readyUrl)]);

  const payload = {
    time: new Date().toISOString(),
    baseUrl: HEALTH_BASE_URL,
    live: { status: live.status, ok: live.ok },
    ready: { status: ready.status, ok: ready.ok },
  };

  if (live.ok && ready.ok) {
    console.log(JSON.stringify({ level: 'INFO', message: 'health_smoke_ok', ...payload }));
    process.exit(0);
  }

  console.error(JSON.stringify({
    level: 'ERROR',
    message: 'health_smoke_failed',
    ...payload,
    liveBody: live.body,
    readyBody: ready.body,
  }));
  process.exit(1);
};

run().catch((error) => {
  console.error(JSON.stringify({
    level: 'ERROR',
    message: 'health_smoke_exception',
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exit(1);
});
