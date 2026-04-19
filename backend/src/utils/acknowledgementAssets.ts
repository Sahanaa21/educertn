import fs from 'fs';
import path from 'path';

const LOGO_CANDIDATES = [
    path.resolve(process.cwd(), '..', 'frontend', 'public', 'logo.png'),
    path.resolve(process.cwd(), '..', 'frontend', 'public', 'college.image.png')
];

const getFirstExistingPath = (): string | null => {
    for (const candidate of LOGO_CANDIDATES) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
};

export const getAcknowledgementLogoPath = (): string | null => {
    return getFirstExistingPath();
};

export const getAcknowledgementLogoDataUri = (): string | null => {
    const logoPath = getFirstExistingPath();
    if (!logoPath) return null;

    const buffer = fs.readFileSync(logoPath);
    const extension = path.extname(logoPath).toLowerCase();
    const mimeType = extension === '.jpg' || extension === '.jpeg'
        ? 'image/jpeg'
        : extension === '.svg'
            ? 'image/svg+xml'
            : 'image/png';

    return `data:${mimeType};base64,${buffer.toString('base64')}`;
};
