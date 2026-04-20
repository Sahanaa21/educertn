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
