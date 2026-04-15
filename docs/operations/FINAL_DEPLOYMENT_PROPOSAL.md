# Operations References (New)

- `OPERATIONS_RUNBOOK.md`
- `INCIDENT_ROLLBACK_PLAYBOOK.md`
- `WEEK1_WEEK2_EXECUTION_TRACKER.md`
- `backend/scripts/OPERATIONS_BACKUP_GUIDE.md`

# College Portal Deployment Proposal

## Overview
The system is a web-based college portal to manage student records, examination processes, certificate services (TC, migration, correction, re-evaluation), and verification requests from external organizations.

The application source code is approximately 10 MB. In production, growth will primarily come from database records and uploaded documents.

## Self-Hosted Deployment
The target production state is a single college-managed server running the frontend, backend, PostgreSQL, and local file storage. This avoids external hosting and storage dependencies while keeping operational ownership inside the institution.

### Services
- Frontend: Next.js running on the college server
- Backend: Node.js API running on port 5000
- Database: Local PostgreSQL instance
- Storage: Local `/uploads` directory on the same server
- Email: College SMTP relay or another institutional SMTP server

### Operational Summary
- One deployment target to manage
- No dependency on third-party hosting platforms
- Uploaded documents remain on the institution's server
- Easier IT handover and backup planning
- Suitable for internal network access or NGINX reverse proxy exposure

## Deployment and Maintenance Model
- Source code remains in the official GitHub repository with controlled access.
- Deployment can be automated through CI/CD for faster and safer releases.
- The developer manages updates and incident response.
- The college retains ownership of hosting infrastructure, domain, and production credentials.

## Storage Estimate
- Per student: 2 MB to 5 MB
- 1,000 students: approximately 2 GB to 5 GB
- Long-term projection: 20 GB to 100 GB

## Email Note
College email can be used for portal notifications only if the college provides a working SMTP relay (host, port, authentication, and allowed sender identity), plus SPF, DKIM, and DMARC DNS setup.

## Final Website Name
GAT Academic Portal

## Conclusion
The system is deployment-ready.

- Choose Option 1 for a lower-cost, fast launch.
- Choose Option 2 for long-term reliability, scalability, and institutional ownership.

For official college production use over the next 5 to 10 years, Option 2 is recommended.