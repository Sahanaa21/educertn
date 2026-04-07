# Release Clean Checklist

Use this checklist before each demo or handover release.

## 1) Environment and Secrets
- Ensure backend `.env` values are correct for the target environment.
- Ensure frontend `.env.local` has the right `NEXT_PUBLIC_API_BASE_URL`.
- Never commit real secrets.
- Rotate personal/demo secrets before official handover.

## 2) Data Hygiene
- Remove test/demo records:
  - `npm --prefix backend run cleanup:test-data -- --apply`
- Remove orphan file refs:
  - `npm --prefix backend run cleanup:orphan-files`

## 3) Build and Validation
- Run:
  - `npm run check`
  - `npm --prefix backend run test:verification`
  - `npm --prefix backend run test:issues`

## 4) Manual Smoke
- Student login + request submission.
- Company login + verification submission.
- Admin login + status updates.
- Settings save and reload.
- Issue report submit + admin status update.

## 5) Handover Readiness
- Keep production-only vars in provider secrets, not repo files.
- Confirm ownership transfer details (accounts/billing/access).
- Keep rollback-ready copy of previous env values.
- Follow `backend/HANDOVER_KEYS_CHECKLIST.md` for official key swap.
