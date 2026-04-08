# Final Go-Live Execution Checklist

Purpose: Single execution checklist for production launch.

Use this as the only active go-live runbook.

## 1) Decision and Ownership
- [ ] Approve final hosting option from FINAL_DEPLOYMENT_PROPOSAL.md (Owner: College Management)
- [ ] Confirm production billing owner account (Owner: College Management)
- [ ] Confirm production domain owner and DNS access owner (Owner: College IT)
- [ ] Confirm source repository access list and roles (Owner: Developer + College IT)

## 2) Infrastructure Provisioning
- [ ] Frontend hosting provisioned (Owner: Developer)
- [ ] Backend hosting provisioned (Owner: Developer)
- [ ] Managed PostgreSQL provisioned (Owner: Developer)
- [ ] Object storage bucket provisioned (Owner: Developer)
- [ ] Email transport provisioned (College SMTP relay or SES) (Owner: College IT + Developer)
- [ ] SSL certificates configured and valid (Owner: Developer)
- [ ] Monitoring and alerting enabled (Owner: Developer)
- [ ] Backup policy enabled for database (Owner: Developer)

## 3) Production Secrets and Configuration
- [ ] Production environment variables set in frontend and backend (Owner: Developer)
- [ ] JWT and app secrets rotated from development values (Owner: Developer)
- [ ] Payment provider live keys configured (Owner: Developer)
- [ ] SMTP/SES credentials configured and verified (Owner: College IT + Developer)
- [ ] CORS, trusted origins, and callback URLs verified (Owner: Developer)

## 4) Data and Access Controls
- [ ] Admin production accounts created and verified (Owner: Developer + College Admin)
- [ ] Test/demo records removed from production database (Owner: Developer)
- [ ] File storage permissions reviewed (private/public access rules) (Owner: Developer)
- [ ] Least-privilege access applied to services and credentials (Owner: Developer)

## 5) End-to-End Production Smoke Test
- [ ] Student login, profile, upload, request creation works (Owner: Developer)
- [ ] Student payment flow completes and status updates correctly (Owner: Developer)
- [ ] Company login, request flow, payment, and status works (Owner: Developer)
- [ ] Admin dashboard, certificates, verifications, issues, settings work (Owner: Developer)
- [ ] Email notifications deliver successfully (Owner: Developer + College IT)
- [ ] Health endpoint and API error handling verified (Owner: Developer)

## 6) Cutover and Launch
- [ ] DNS switched to production targets (Owner: College IT)
- [ ] Final release tag created in repository (Owner: Developer)
- [ ] Maintenance window communications sent (Owner: College Admin)
- [ ] Launch approved and portal opened to users (Owner: College Management)

## 7) Post-Launch (First 7 Days)
- [ ] Monitor uptime, errors, payment callbacks, and email bounce rates daily (Owner: Developer)
- [ ] Validate daily database backups are running and restorable (Owner: Developer)
- [ ] Record and resolve user-reported issues with priority tracking (Owner: Developer + College Admin)

## Sign-Off
- Technical sign-off (Developer): ____________________  Date: __________
- Infrastructure sign-off (College IT): ______________  Date: __________
- Administrative sign-off (College): _________________  Date: __________
