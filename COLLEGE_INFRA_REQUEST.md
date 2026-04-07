# College Infra and Key Request Template

Use this document when requesting official production inputs from the college IT team.

## 1) Ownership and Governance
- Confirm production billing owner and backup contact.
- Confirm technical owner for deployment approvals.
- Confirm incident escalation contacts (primary and secondary).

## 2) Hosting (AWS + Ubuntu)
- AWS account ID and deployment region.
- EC2 Ubuntu server details:
	- instance name
	- public IP and/or DNS
	- SSH access method (public key based)
	- security group rules (80/443 open, 22 restricted)
- Reverse proxy and TLS setup owner (Nginx + certificate issuance).

## 3) Database (PostgreSQL)
- Managed DB endpoint (RDS or approved external provider).
- Database name, username, and password (or secret reference).
- Backup policy (daily automated backup + retention period).
- Restore drill owner and schedule.

## 4) Email (official sender)
- SMTP provider choice (SES or institutional SMTP).
- SMTP host, port, username, password.
- Verified sender identity:
	- from email
	- domain verification status

## 5) Payments (Zwitch Live)
- Live API key.
- Live API secret.
- Live layer access key (if used).
- Confirm production API base URL and live order paths.
- Confirm webhook/contact details if required by provider.

## 6) App Configuration Values
- Frontend public URL.
- Backend API URL.
- Allowed frontend origins list.
- Admin alert email and bootstrap admin emails.

## 7) Capacity and Performance Inputs
- Expected peak concurrent users.
- Expected daily active users.
- Expected file uploads per day and average file size.
- Growth estimate for 12 months.
- Uptime target and maintenance window.

## 8) Security Baseline to Confirm
- Enforce HTTPS only.
- Restrict SSH to allowlisted IPs.
- Enforce MFA for all cloud/provider accounts.
- Quarterly secret rotation policy.
- Application and access logs retention policy.

## 9) Handover Acceptance Criteria
- Deployment documented and repeatable.
- Environment variables stored in provider secret manager.
- Smoke tests pass after deployment.
- Rollback procedure tested once.
