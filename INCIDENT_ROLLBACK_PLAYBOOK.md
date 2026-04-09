# Incident and Rollback Playbook

## Severity Levels
- P1: Site down, login down, payment failure spike, data corruption risk
- P2: Major feature unavailable for many users
- P3: Partial degradation or non-critical bug

## P1 Immediate Response (0-15 minutes)
1. Acknowledge incident in team channel.
2. Check health endpoints and logs with request IDs.
3. Enable maintenance mode for risky write paths if needed.
4. Decide: hotfix or rollback.

## Diagnosis Checklist
1. Is DB reachable?
2. Are error rates increasing rapidly?
3. Is one route causing failures?
4. Was there a recent deploy/config change?
5. Are third-party services failing (SMTP/payment)?

## Rollback Procedure
1. Identify last known good commit/tag.
2. Redeploy previous release artifact.
3. Verify `/api/health/live` and `/api/health/ready`.
4. Run critical smoke tests:
   - auth
   - issue create
   - admin issue list
5. Keep monitoring for 30 minutes.

## Hotfix Procedure
1. Create branch `hotfix/<short-name>` from main.
2. Apply minimal safe change only.
3. Run local checks and CI.
4. Merge and deploy with focused smoke test.
5. Create follow-up task for root-cause prevention.

## Post-Incident (within 24 hours)
1. Write root cause summary.
2. Document timeline (detect, mitigate, resolve).
3. Add missing monitoring/alerts/tests.
4. Add regression test or guardrail.
5. Share prevention actions and owners.

## Recommended Alert Triggers
1. `/api/health/ready` fails 2 consecutive checks.
2. 5xx error rate > 3% for 5 minutes.
3. Login/OTP failure spike > baseline.
4. Payment verification failures > baseline.
5. SMTP send failures above threshold.
