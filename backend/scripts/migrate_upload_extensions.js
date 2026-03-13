/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const uploadsDir = path.resolve(process.cwd(), 'uploads');

const hasExtension = (p) => Boolean(path.extname(p || '').trim());

function inferExtensionFromBuffer(buffer) {
    if (!buffer || buffer.length < 4) return null;

    // PDF: 25 50 44 46 (%PDF)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return '.pdf';

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer.length >= 8 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
        buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) return '.png';

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return '.jpg';

    // Legacy Office (.doc): D0 CF 11 E0 A1 B1 1A E1
    if (buffer.length >= 8 &&
        buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0 &&
        buffer[4] === 0xA1 && buffer[5] === 0xB1 && buffer[6] === 0x1A && buffer[7] === 0xE1) return '.doc';

    // ZIP-based formats (docx): 50 4B 03 04 / 50 4B 05 06 / 50 4B 07 08
    if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
        const snippet = buffer.toString('utf8');
        if (snippet.includes('word/') || snippet.includes('[Content_Types].xml')) return '.docx';
        return '.zip';
    }

    return null;
}

function resolveDiskPath(storedPath) {
    if (!storedPath) return null;

    if (storedPath.startsWith('/uploads/')) {
        return path.join(uploadsDir, path.basename(storedPath));
    }

    if (path.isAbsolute(storedPath)) {
        return storedPath;
    }

    const direct = path.resolve(process.cwd(), storedPath);
    if (fs.existsSync(direct)) return direct;

    const normalized = storedPath.replace(/\\/g, '/');
    const uploadsIndex = normalized.lastIndexOf('/uploads/');
    if (uploadsIndex >= 0) {
        const relativeFromUploads = normalized.slice(uploadsIndex + 1);
        return path.resolve(process.cwd(), relativeFromUploads);
    }

    return path.resolve(uploadsDir, path.basename(normalized));
}

function buildUpdatedStoredPath(originalStoredPath, newDiskPath) {
    if (originalStoredPath.startsWith('/uploads/')) {
        return `/uploads/${path.basename(newDiskPath)}`;
    }

    if (path.isAbsolute(originalStoredPath)) {
        return path.join(path.dirname(originalStoredPath), path.basename(newDiskPath));
    }

    return path.relative(process.cwd(), newDiskPath).replace(/\\/g, '/');
}

function uniqueTargetPath(basePathWithExt) {
    if (!fs.existsSync(basePathWithExt)) return basePathWithExt;

    const ext = path.extname(basePathWithExt);
    const stem = basePathWithExt.slice(0, -ext.length);
    let i = 1;
    while (true) {
        const candidate = `${stem}-${i}${ext}`;
        if (!fs.existsSync(candidate)) return candidate;
        i += 1;
    }
}

async function migrateCertificateIdProofs({ dryRun }) {
    const certs = await prisma.certificateRequest.findMany({
        select: { id: true, idProofUrl: true }
    });

    let changed = 0;
    for (const cert of certs) {
        const original = cert.idProofUrl;
        if (!original || hasExtension(original)) continue;

        const diskPath = resolveDiskPath(original);
        if (!diskPath || !fs.existsSync(diskPath) || hasExtension(diskPath)) continue;

        const header = fs.readFileSync(diskPath).subarray(0, 8192);
        const ext = inferExtensionFromBuffer(header);
        if (!ext) continue;

        const targetPath = uniqueTargetPath(`${diskPath}${ext}`);
        const nextStoredPath = buildUpdatedStoredPath(original, targetPath);

        if (!dryRun) {
            fs.renameSync(diskPath, targetPath);
            await prisma.certificateRequest.update({
                where: { id: cert.id },
                data: { idProofUrl: nextStoredPath }
            });
        }

        changed += 1;
        console.log(`[CERT] ${cert.id} -> ${path.basename(targetPath)}`);
    }

    return changed;
}

async function migrateVerificationFiles({ dryRun }) {
    const verifications = await prisma.verificationRequest.findMany({
        select: { id: true, uploadedTemplate: true, completedFile: true }
    });

    let changed = 0;
    for (const row of verifications) {
        const fields = [
            { key: 'uploadedTemplate', value: row.uploadedTemplate },
            { key: 'completedFile', value: row.completedFile }
        ];

        for (const field of fields) {
            const original = field.value;
            if (!original || hasExtension(original)) continue;

            const diskPath = resolveDiskPath(original);
            if (!diskPath || !fs.existsSync(diskPath) || hasExtension(diskPath)) continue;

            const header = fs.readFileSync(diskPath).subarray(0, 8192);
            const ext = inferExtensionFromBuffer(header);
            if (!ext) continue;

            const targetPath = uniqueTargetPath(`${diskPath}${ext}`);
            const nextStoredPath = buildUpdatedStoredPath(original, targetPath);

            if (!dryRun) {
                fs.renameSync(diskPath, targetPath);
                await prisma.verificationRequest.update({
                    where: { id: row.id },
                    data: { [field.key]: nextStoredPath }
                });
            }

            changed += 1;
            console.log(`[VERIF:${field.key}] ${row.id} -> ${path.basename(targetPath)}`);
        }
    }

    return changed;
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    console.log(`Starting upload-extension migration (dryRun=${dryRun})...`);

    const certChanged = await migrateCertificateIdProofs({ dryRun });
    const verifChanged = await migrateVerificationFiles({ dryRun });

    console.log(`Done. Updated files: certificates=${certChanged}, verifications=${verifChanged}`);
}

main()
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
