# Final Deployment Proposal

## Project Footprint
- Tracked source code size: about 10.03 MB across 132 tracked files.
- Current workspace size is much larger because of local dependencies and caches; that is not deployment size.
- The real growth drivers in production will be database records and uploaded documents, not the application code.

## Why the current free-tier stack should not be the final production plan
- Render/Vercel free tiers are fine for demos, but they are not the best long-term fit for a college portal with daily usage.
- Free tiers can sleep, rate-limit, or change limits.
- The database, uploads, and email delivery are the parts that will grow first.
- A college portal should be owned by the college, with college-controlled domain, email, storage, and database.

## Option 1: Low-Cost Production Setup
Best if the college wants the cheapest stable launch with minimal code changes.

### Recommended stack
- Frontend: Vercel or Cloudflare Pages.
- Backend: Render paid starter service or a small always-on VPS.
- Database: Managed PostgreSQL on Supabase/Neon paid tier or equivalent.
- File storage: S3 or Cloudinary.
- Email: College SMTP relay if available, otherwise SES.
- DNS: College domain with a subdomain like `verify.gat.ac.in`.

### Pros
- Lowest monthly cost.
- Smallest migration effort from the current setup.
- Fast to launch.

### Cons
- Still split across multiple vendors.
- Less ideal for very long-term ownership.
- More manual maintenance than a fully managed AWS stack.

### Who should choose this
- If the college wants the lowest immediate spend.
- If they are okay managing a few services separately.

## Option 2: Best Long-Term Setup for 5-10 Years
This is the option I recommend for a college system that must survive growth and regular use.

### Recommended stack
- Frontend: AWS Amplify Hosting or S3 + CloudFront.
- Backend: AWS App Runner or ECS Fargate for the Node/Express API.
- Database: AWS RDS PostgreSQL.
- File storage: AWS S3.
- Email: AWS SES or the college's own SMTP relay.
- Secrets: AWS Systems Manager Parameter Store or Secrets Manager.
- DNS and SSL: Route 53 + ACM.
- Monitoring: CloudWatch logs and alarms.

### Pros
- Single cloud provider ownership.
- Better long-term maintainability.
- Scales cleanly for students, companies, and staff.
- No server patching if App Runner/Fargate is used.
- Good fit for a college that may hand this to another team later.

### Cons
- Higher setup effort.
- Slightly higher cost than the bare-minimum option.
- Needs one careful migration phase.

### Who should choose this
- If the college wants the most durable and supportable production setup.
- If they expect regular daily usage and future growth.
- If they want fewer moving parts and better ownership.

## Email Answer: Can College Email Send Website Emails For Free?
Short answer: only if the college already has SMTP/email infrastructure.

### What is possible
- If `example@gat.ac.in` is backed by a real SMTP relay or mail server, the website can send email through it.
- The site does not need Brevo specifically.
- Nodemailer can send through the college's own SMTP server.

### What is still required
- SMTP host, port, username, password, or relay access.
- DNS records for SPF, DKIM, and DMARC.
- A sender address such as `no-reply@gat.ac.in` or `verify@gat.ac.in`.

### What is not enough
- Just having a mailbox by itself is not enough.
- A website cannot magically send mail "for free" without a mail transport service.

### Recommendation
- For the final production setup, use `no-reply@gat.ac.in` or `verify@gat.ac.in` with the college's SMTP relay if they already have one.
- If they do not, use AWS SES in the best long-term setup.

## Final Website Name Recommendation
Use:
- `GAT Verify`

Why this name:
- Short.
- Clear.
- Easy for students, faculty, and companies to remember.
- Works well for a subdomain and email branding.

Suggested email identity:
- `no-reply@gat.ac.in`
- or `verify@gat.ac.in`

## Final Recommendation
- If the college wants the best long-term answer, choose Option 2.
- If they want the cheapest launch, choose Option 1 only as an interim step.
- For a real college production portal with daily usage, I recommend Option 2.
