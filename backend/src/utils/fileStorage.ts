import fs from 'fs';
import path from 'path';
import type { Response } from 'express';

export const getUploadsDir = (): string => path.resolve(process.cwd(), 'uploads');

export const ensureUploadsDir = (): void => {
	fs.mkdirSync(getUploadsDir(), { recursive: true });
};

const getBaseUrl = (): string => {
	return String(process.env.BASE_URL || process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL || '').replace(/\/$/, '');
};

const normalizeStoredRelativePath = (storedValue: string): string => {
	const normalized = storedValue.replace(/\\/g, '/').trim();

	if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
		try {
			const parsed = new URL(normalized);
			return parsed.pathname.replace(/^\/+/, '').replace(/^uploads\//i, '');
		} catch {
			return path.basename(normalized);
		}
	}

	if (normalized.startsWith('/uploads/')) {
		return normalized.slice('/uploads/'.length);
	}

	const uploadsIndex = normalized.lastIndexOf('/uploads/');
	if (uploadsIndex >= 0) {
		return normalized.slice(uploadsIndex + '/uploads/'.length);
	}

	if (normalized.startsWith('uploads/')) {
		return normalized.slice('uploads/'.length);
	}

	return normalized;
};

export const buildUploadUrl = (relativePath: string): string => {
	const normalizedRelativePath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
	const encodedPath = normalizedRelativePath
		.split('/')
		.filter(Boolean)
		.map((segment) => encodeURIComponent(segment))
		.join('/');
	const baseUrl = getBaseUrl();
	if (!baseUrl) {
		return `/uploads/${encodedPath}`;
	}
	return `${baseUrl}/uploads/${encodedPath}`;
};

export const getUploadedFileUrl = (file: Pick<Express.Multer.File, 'filename' | 'path' | 'originalname'> | null | undefined): string => {
	if (!file) return '';

	const relativePath = file.path
		? path.relative(getUploadsDir(), file.path)
		: String(file.filename || file.originalname || '').trim();

	if (!relativePath) return '';
	return buildUploadUrl(relativePath);
};

export const resolveLocalStoredPath = (storedPath: string | null | undefined): string | null => {
	if (!storedPath) return null;

	const relativePath = normalizeStoredRelativePath(storedPath);
	const candidate = path.resolve(getUploadsDir(), relativePath);
	if (fs.existsSync(candidate)) return candidate;

	const fallbackByName = path.resolve(getUploadsDir(), path.basename(relativePath));
	if (fs.existsSync(fallbackByName)) return fallbackByName;

	return null;
};

export const getStoredFileExtension = (storedValue: string | null | undefined): string => {
	if (!storedValue) return '';

	return path.extname(normalizeStoredRelativePath(storedValue) || '');
};

export const sendStoredFile = async (
	res: Response,
	storedValue: string | null | undefined,
	downloadName: string
): Promise<boolean> => {
	if (!storedValue) return false;

	const resolvedPath = resolveLocalStoredPath(storedValue);
	if (!resolvedPath) return false;

	await new Promise<void>((resolve, reject) => {
		res.download(resolvedPath, downloadName, (error) => {
			if (error) reject(error);
			else resolve();
		});
	});

	return true;
};
