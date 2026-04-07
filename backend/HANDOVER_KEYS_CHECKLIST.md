# Handover Key Swap Checklist

Goal: move from personal/demo keys to college-owned keys with no code changes.

## 1) Prepare
- Ensure backend uses only env variables (no hardcoded keys/URLs).
- Confirm frontend uses NEXT_PUBLIC_API_BASE_URL only.
- Keep current variable names unchanged.

## 2) Replace In Backend .env
- DATABASE_URL
- JWT_SECRET
- FRONTEND_URL / FRONTEND_URLS
- ADMIN_ALERT_EMAIL
- ADMIN_BOOTSTRAP_EMAILS
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_FROM_EMAIL
- SMTP_FROM_NAME
- SMTP_FORCE_IPV4
- SMTP_SECURE
- ZWITCH_API_BASE_URL
- ZWITCH_CREATE_ORDER_PATH
- ZWITCH_FETCH_ORDER_PATH_TEMPLATE
- ZWITCH_API_KEY
- ZWITCH_API_SECRET
- ZWITCH_AUTH_HEADER (if used)
- ZWITCH_LAYER_ACCESS_KEY
- ZWITCH_ACCESS_KEY (if used)
- ZWITCH_CHECKOUT_KEY_PREFERENCE
- ZWITCH_CHECKOUT_ENV (set to live at final cutover)
- ZWITCH_API_TIMEOUT_MS
- ZWITCH_DEFAULT_CONTACT
- ZWITCH_DEFAULT_EMAIL

## 3) Replace In Frontend .env.local
- NEXT_PUBLIC_API_BASE_URL

## 4) Validate Immediately After Key Swap
From repo root:
- npm run check
- npm --prefix backend run test:verification
- npm --prefix backend run test:issues

Manual smoke:
- Student OTP login and certificate request creation
- Company OTP login and verification request upload
- Admin login, status updates, settings save
- Issue report submission and admin status update

Optional hygiene before final handover:
- npm --prefix backend run cleanup:test-data -- --apply

## 5) Security Tasks At Handover
- Rotate all personal/demo secrets after go-live.
- Enable 2FA for all provider and deployment accounts.
- Remove old personal API keys and tokens.
- Transfer ownership/billing to college accounts.

## 6) Rollback
- Keep previous env backup for one release.
- If failure occurs, restore previous env values and redeploy.
- Confirm /api/health and admin login after rollback.
