# Operations References (New)

- `OPERATIONS_RUNBOOK.md`
- `INCIDENT_ROLLBACK_PLAYBOOK.md`
- `WEEK1_WEEK2_EXECUTION_TRACKER.md`
- `backend/scripts/OPERATIONS_BACKUP_GUIDE.md`

# College Portal Deployment Proposal

## Overview
The system is a web-based college portal to manage student records, examination processes, certificate services (TC, migration, correction, re-evaluation), and verification requests from external organizations.

The application source code is approximately 10 MB. In production, growth will primarily come from database records and uploaded documents.

## Current Limitation
The system is currently deployed on Render, Vercel, and Supabase. This setup is suitable for development and testing, but not ideal for official college operations because of:

- No strict uptime commitment on free tiers
- Limited scalability during peak periods (for example, examination cycles)
- Dependency on multiple third-party providers
- Reduced long-term control and operational reliability

## Option 1: Cost-Optimized Setup

### Services
- Frontend: Vercel or Cloudflare Pages
- Backend: Render paid service or managed VPS
- Database: Supabase or Neon (PostgreSQL)
- Storage: Cloudinary or Amazon S3
- Email: College SMTP relay or Amazon SES

### Estimated Monthly Cost
INR 4,000 to INR 8,000

### Summary
- Quick deployment with minimal architectural change
- Lower monthly cost
- Uses multiple service providers
- Good as an interim production launch

## Option 2: AWS-Based Setup (Recommended)

### Services (Amazon Web Services)
- Frontend: AWS Amplify Hosting or S3 plus CloudFront
- Backend: AWS App Runner
- Database: AWS RDS (PostgreSQL)
- Storage: AWS S3
- Email: AWS SES or college SMTP relay
- Secrets and configuration: AWS Systems Manager Parameter Store or Secrets Manager
- DNS and SSL: Route 53 plus ACM
- Monitoring: CloudWatch logs and alerts

### Estimated Monthly Cost
INR 5,000 to INR 10,000

### Summary
- Single platform with stronger control and governance
- Better scalability for academic peak workloads
- Easier long-term maintenance for institutional use
- Better auditability, monitoring, and ownership alignment

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
