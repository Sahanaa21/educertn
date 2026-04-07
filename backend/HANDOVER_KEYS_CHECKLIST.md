# Handover Key Swap Checklist

Goal: move from personal/demo keys to college-owned keys with no code changes.

## 1) Prepare
- Ensure backend uses only env variables (no hardcoded keys/URLs).
- Confirm frontend uses NEXT_PUBLIC_API_BASE_URL only.
- Keep current variable names unchanged.
- Decide target runtime with college team (AWS EC2 Ubuntu recommended for this backend).
- Confirm who owns production billing, DNS, and incident response contacts.

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
- CLOUDINARY_CLOUD_NAME (if enabled)
- CLOUDINARY_API_KEY (if enabled)
- CLOUDINARY_API_SECRET (if enabled)

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
- Restrict server SSH to allowlisted IPs and disable password login (key-only auth).
- Use HTTPS with valid TLS cert, force HTTP to HTTPS redirects.
- Add automated DB backups and monthly restore test.

## 6) College Inputs You Must Collect
- AWS account owner email and billing owner contact.
- AWS region for deployment (single region for app + DB).
- EC2 Ubuntu access:
	- SSH public key to authorize
	- server public IP / DNS
	- security group rules (80/443 open, 22 restricted)
- Database decision and credentials:
	- RDS PostgreSQL endpoint/user/password/database or external managed Postgres URL
- SMTP provider credentials (SES or institutional SMTP):
	- SMTP host/port/user/pass
	- from email/domain already verified
- Zwitch production credentials:
	- live API key
	- live API secret
	- layer access key (if used)
	- confirm live order endpoints
- Domain and DNS access details:
	- frontend domain
	- API subdomain
	- DNS manager access/contact

## 7) Capacity Baseline To Ask College
- Expected peak concurrent users.
- Expected daily requests and file uploads.
- Data retention policy and estimated yearly growth.
- Required uptime target and maintenance window.

## 8) Rollback
- Keep previous env backup for one release.
- If failure occurs, restore previous env values and redeploy.
- Confirm /api/health and admin login after rollback.
