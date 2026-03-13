/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const resolveStoredFilePath = (storedPath) => {
  if (!storedPath) return null;

  if (storedPath.startsWith('/uploads/')) {
    return path.resolve(process.cwd(), 'uploads', path.basename(storedPath));
  }

  const direct = path.isAbsolute(storedPath)
    ? storedPath
    : path.resolve(process.cwd(), storedPath);
  if (fs.existsSync(direct)) return direct;

  const normalized = String(storedPath).replace(/\\/g, '/');
  const uploadsIndex = normalized.lastIndexOf('/uploads/');
  if (uploadsIndex >= 0) {
    const relativeFromUploads = normalized.slice(uploadsIndex + 1); // uploads/...
    const candidate = path.resolve(process.cwd(), relativeFromUploads);
    if (fs.existsSync(candidate)) return candidate;
  }

  const fallback = path.resolve(process.cwd(), 'uploads', path.basename(normalized));
  if (fs.existsSync(fallback)) return fallback;

  return null;
};

async function processCertificates({ apply }) {
  const certs = await prisma.certificateRequest.findMany({
    where: { idProofUrl: { not: null } },
    select: { id: true, idProofUrl: true, status: true }
  });

  const orphaned = certs.filter((c) => !resolveStoredFilePath(c.idProofUrl));

  for (const c of orphaned) {
    console.log(`[CERT] Missing idProof file -> ${c.id} (${c.idProofUrl})`);
    if (apply) {
      await prisma.certificateRequest.update({
        where: { id: c.id },
        data: {
          idProofUrl: null,
          status: c.status === 'COMPLETED' ? 'PROCESSING' : c.status,
          rejectionReason: c.status === 'REJECTED' ? 'Uploaded ID proof file is missing. Please re-upload and resubmit.' : undefined,
        }
      });
    }
  }

  return orphaned.length;
}

async function processVerifications({ apply }) {
  const verifications = await prisma.verificationRequest.findMany({
    select: { id: true, requestId: true, uploadedTemplate: true, completedFile: true, status: true }
  });

  let missingTemplate = 0;
  let missingCompleted = 0;

  for (const v of verifications) {
    const hasTemplate = !!resolveStoredFilePath(v.uploadedTemplate);
    const hasCompleted = !v.completedFile || !!resolveStoredFilePath(v.completedFile);

    if (!hasTemplate) {
      missingTemplate += 1;
      console.log(`[VERIF] Missing template file -> ${v.requestId} (${v.uploadedTemplate})`);
      if (apply) {
        await prisma.verificationRequest.update({
          where: { id: v.id },
          data: {
            uploadedTemplate: '',
            status: 'REJECTED'
          }
        });
      }
      continue;
    }

    if (!hasCompleted) {
      missingCompleted += 1;
      console.log(`[VERIF] Missing completedFile -> ${v.requestId} (${v.completedFile})`);
      if (apply) {
        await prisma.verificationRequest.update({
          where: { id: v.id },
          data: {
            completedFile: null,
            status: v.status === 'COMPLETED' ? 'PROCESSING' : v.status
          }
        });
      }
    }
  }

  return { missingTemplate, missingCompleted };
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`Starting orphan file-ref cleanup (apply=${apply})...`);

  const certCount = await processCertificates({ apply });
  const verif = await processVerifications({ apply });

  console.log('Summary:');
  console.log(`- Certificate requests fixed: ${certCount}`);
  console.log(`- Verification requests with missing template: ${verif.missingTemplate}`);
  console.log(`- Verification requests with missing completed file: ${verif.missingCompleted}`);

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to persist these changes.');
  } else {
    console.log('Cleanup applied successfully.');
  }
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
