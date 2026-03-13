/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TEST_EMAILS = [
  'automation@test.local',
  'qa+issue-test@example.com',
  'qa-company@example.com',
];

async function collectCandidates() {
  const issueCandidates = await prisma.issueReport.findMany({
    where: {
      OR: [
        { reportedByEmail: { in: TEST_EMAILS } },
        { title: { startsWith: 'Issue test:' } },
        { description: { contains: 'Integration test for issue reporting API' } },
        { reportedByName: { contains: 'Automation Test' } },
      ],
    },
    select: { id: true, title: true, reportedByEmail: true, createdAt: true },
  });

  const verificationCandidates = await prisma.verificationRequest.findMany({
    where: {
      OR: [
        { companyEmail: { in: TEST_EMAILS } },
        {
          AND: [
            { companyName: 'Test Company Pvt Ltd' },
            { contactPerson: 'QA Tester' },
          ],
        },
        {
          AND: [
            { studentName: 'Student One' },
            { usn: '1GA23IS137' },
          ],
        },
      ],
    },
    select: { id: true, requestId: true, companyEmail: true, studentName: true, createdAt: true },
  });

  const otpCandidates = await prisma.oTP.findMany({
    where: { email: { in: TEST_EMAILS } },
    select: { id: true, email: true, createdAt: true },
  });

  const userCandidates = await prisma.user.findMany({
    where: {
      email: { in: TEST_EMAILS },
      role: { in: ['COMPANY', 'STUDENT'] },
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  return { issueCandidates, verificationCandidates, otpCandidates, userCandidates };
}

async function applyCleanup(candidates) {
  const issueIds = candidates.issueCandidates.map((r) => r.id);
  const verificationIds = candidates.verificationCandidates.map((r) => r.id);
  const otpIds = candidates.otpCandidates.map((r) => r.id);
  const userIds = candidates.userCandidates.map((r) => r.id);

  await prisma.$transaction(async (tx) => {
    if (issueIds.length) {
      await tx.issueReport.deleteMany({ where: { id: { in: issueIds } } });
    }
    if (verificationIds.length) {
      await tx.verificationRequest.deleteMany({ where: { id: { in: verificationIds } } });
    }
    if (otpIds.length) {
      await tx.oTP.deleteMany({ where: { id: { in: otpIds } } });
    }
    if (userIds.length) {
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });
}

async function main() {
  const apply = process.argv.includes('--apply');
  const candidates = await collectCandidates();

  console.log('Cleanup candidates found:');
  console.log(`- Issue reports: ${candidates.issueCandidates.length}`);
  console.log(`- Verification requests: ${candidates.verificationCandidates.length}`);
  console.log(`- OTP rows: ${candidates.otpCandidates.length}`);
  console.log(`- Users: ${candidates.userCandidates.length}`);

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to delete these records.');
    return;
  }

  await applyCleanup(candidates);
  console.log('Cleanup applied successfully.');
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
