import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import type { Response } from 'express';

export const isRemoteFileUrl = (value: string | null | undefined): value is string => {
	return typeof value === 'string' && /^https?:\/\//i.test(value);
};

export const resolveLocalStoredPath = (storedPath: string | null | undefined): string | null => {
	if (!storedPath) return null;

	const direct = path.isAbsolute(storedPath) ? storedPath : path.resolve(process.cwd(), storedPath);
	if (fs.existsSync(direct)) return direct;

	const normalized = storedPath.replace(/\\/g, '/');
	const uploadsIndex = normalized.lastIndexOf('/uploads/');
	if (uploadsIndex >= 0) {
		const relativeFromUploads = normalized.slice(uploadsIndex + 1);
		const candidate = path.resolve(process.cwd(), relativeFromUploads);
		if (fs.existsSync(candidate)) return candidate;
	}

	const fallbackByName = path.resolve(process.cwd(), 'uploads', path.basename(normalized));
	if (fs.existsSync(fallbackByName)) return fallbackByName;

	return null;
};

export const getStoredFileExtension = (storedValue: string | null | undefined): string => {
	if (!storedValue) return '';

	if (isRemoteFileUrl(storedValue)) {
		try {
			return path.extname(new URL(storedValue).pathname);
		} catch {
			return '';
		}
	}

	return path.extname(resolveLocalStoredPath(storedValue) || storedValue || '');
};

export const sendStoredFile = async (
	res: Response,
	storedValue: string | null | undefined,
	downloadName: string
): Promise<boolean> => {
	if (!storedValue) return false;

	if (isRemoteFileUrl(storedValue)) {
		const response = await fetch(storedValue);
		if (!response.ok || !response.body) {
			throw new Error(`Unable to fetch remote file (${response.status})`);
		}

		res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
		res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);

		await pipeline(Readable.fromWeb(response.body as any), res);
		return true;
	}

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
