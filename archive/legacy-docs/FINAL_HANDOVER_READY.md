# Final Handover Ready Checklist

Use this as the final sign-off sheet before informing the college that the system is production ready.

## 1) Deployment Health
- Frontend opens successfully.
- Backend health endpoint returns OK.
- Private GitHub repo is connected to deployment providers.
- Latest commit is deployed on both frontend and backend.

## 2) Student Panel Sign-off
- Login and OTP flow works.
- Apply certificate form submission works.
- File upload validation works.
- Payment flow works and verification updates request status.
- My Requests page shows latest status and allows valid actions.

## 3) Company Panel Sign-off
- Company login and OTP flow works.
- New verification request submission works.
- Template upload validation works.
- Payment flow works and verification updates request status.
- Requests list and status rendering work.

## 4) Admin Panel Sign-off
- Admin login works.
- Dashboard data loads.
- Certificates list loads.
- Verifications list loads.
- Issues list loads.
- Settings page loads and Save Settings works.

## 5) Security and Operations
- Repo is private.
- Secrets are not committed.
- Environment values are provider-managed.
- Rate limiting is enabled.
- Request size and upload size limits are enforced.
- Auth-protected routes require valid token.

## 6) Data Hygiene
- Test/demo pending records are cleaned.
- Orphan file-reference cleanup run.
- No debug artifact files in repository.

## 7) Handover Inputs Pending From College
- Hosting/server ownership and contacts.
- Database production credentials.
- SMTP production credentials.
- Zwitch production keys.
- Domain and DNS ownership.
- Admin ownership emails.

## 8) Final Acceptance
- All three panels (student/company/admin) are verified.
- Payment works in normal browser for student and company.
- Team confirms no blocker remains.
- Handover communication sent with required key request list.

## Status
- Project state: READY FOR HANDOVER
- Date: 2026-04-08
