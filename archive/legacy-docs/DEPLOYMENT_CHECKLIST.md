# Deployment Checklist - GAT Certificate Portal

## 1. Feature Freeze and Data Sanity
- [ ] Freeze code changes except critical fixes.
- [ ] Confirm certificate and verification data are loading in admin panels.
- [ ] Confirm Issue Reports are visible in `Admin > Issues`.
- [ ] Verify `PortalSettings` row exists (`id=1`) and values are correct.

## 2. Environment and Secrets
- [ ] Backend `.env` configured: `DATABASE_URL`, `JWT_SECRET`, SMTP settings.
- [ ] Frontend env configured: `NEXT_PUBLIC_API_BASE_URL`.
- [ ] Production SMTP sender verified and whitelisted.
- [ ] Admin credentials rotated from default seed values.

## 3. Database Safety (Backup and Restore SOP)
### Backup
- [ ] Take pre-deploy DB backup/snapshot from Supabase/Postgres console.
- [ ] Export schema and latest data snapshot.
- [ ] Save backup metadata (timestamp, owner, environment).

### Restore Drill (staging preferred)
- [ ] Restore latest backup to staging database.
- [ ] Point staging backend to restored DB.
- [ ] Verify core flows: student request, company verification, admin actions.

## 4. Build and Static Checks
- [ ] Run `npm run check` at repo root.
- [ ] Run `npm --prefix backend run test:verification`.
- [ ] Run `npm --prefix backend run test:issues`.

## 5. End-to-End Smoke Tests
### Student
- [ ] Login with OTP.
- [ ] Submit certificate request and verify appears in `My Requests`.
- [ ] Ensure status badges update correctly.

### Company
- [ ] Login with OTP.
- [ ] Submit verification request with valid file.
- [ ] Download completed response after admin marks complete.

### Admin
- [ ] Login works.
- [ ] Certificates actions (Complete/Reject/upload/post) behave correctly.
- [ ] Verifications actions (download/upload/complete/reject) work.
- [ ] Settings save and reload from backend.
- [ ] Issues list loads and status update works.

## 6. Security and Resilience
- [ ] Validate rate-limiting responses (429) on repeated auth/report requests.
- [ ] Verify protected APIs reject missing/invalid tokens.
- [ ] Verify file upload size/type validation errors are user-friendly.

## 7. UX and Cross-Device Validation
- [ ] Check mobile layouts on student/company/admin pages.
- [ ] Check laptop/desktop table readability and overflow behavior.
- [ ] Verify global error fallback page appears gracefully on forced runtime error.

## 8. Go-Live and Rollback Readiness
- [ ] Deployment owner and rollback owner assigned.
- [ ] Rollback plan documented (revert release + restore DB backup if required).
- [ ] Post-deploy smoke test executed within 15 minutes.

## 9. Post-Deploy Validation
- [ ] Confirm API health endpoint is online (`/api/health`).
- [ ] Confirm OTP emails are delivered with correct branding.
- [ ] Confirm issue-report notification email reaches admin mailbox.
- [ ] Monitor logs for first 24 hours (errors, 5xx spikes, upload failures).
