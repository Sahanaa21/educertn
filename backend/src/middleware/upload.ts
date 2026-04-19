import dotenv from 'dotenv';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { ensureUploadsDir, getUploadsDir } from '../utils/fileStorage';

dotenv.config();

type UploadConfig = {
	folder: string;
	allowedExtensions?: string[];
	allowedMimeTypes?: string[];
	maxFileSizeBytes?: number;
};

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const sanitizeFileName = (originalname: string): string => {
	const parsed = path.parse(originalname || 'file');
	const baseName = parsed.name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
	const extension = parsed.ext.toLowerCase() || '.bin';
	return `${Date.now()}-${baseName}${extension}`;
};

const createUpload = ({
	folder,
	allowedExtensions,
	allowedMimeTypes,
	maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
}: UploadConfig) => multer({
	storage: multer.diskStorage({
		destination: (_req, _file, cb) => {
			ensureUploadsDir();
			const destination = path.resolve(getUploadsDir(), folder);
			fs.mkdirSync(destination, { recursive: true });
			cb(null, destination);
		},
		filename: (_req, file, cb) => {
			cb(null, sanitizeFileName(file.originalname || 'file'));
		},
	}),
	limits: { fileSize: maxFileSizeBytes },
	fileFilter: (_req, file, cb) => {
		if (!allowedExtensions?.length && !allowedMimeTypes?.length) {
			cb(null, true);
			return;
		}

		const ext = path.extname(file.originalname || '').toLowerCase();
		const isValidExt = !allowedExtensions?.length || allowedExtensions.includes(ext);
		const isValidMime = !allowedMimeTypes?.length || allowedMimeTypes.includes(file.mimetype);
		const requiresExt = Boolean(allowedExtensions?.length);
		const requiresMime = Boolean(allowedMimeTypes?.length);
		const isAllowed = (requiresExt ? isValidExt : true) && (requiresMime ? isValidMime : true);

		if (isAllowed) {
			cb(null, true);
			return;
		}

		cb(new Error('Invalid file type'));
	}
});

export const certificateIdProofUpload = createUpload({
	folder: 'certificates/id-proofs',
	allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
	allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
});

export const verificationTemplateUpload = createUpload({
	folder: 'verifications/templates',
	allowedExtensions: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
	allowedMimeTypes: [
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'image/jpeg',
		'image/png'
	],
});

export const verificationCompletedFileUpload = createUpload({
	folder: 'verifications/completed',
	allowedExtensions: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
	allowedMimeTypes: [
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'image/jpeg',
		'image/png'
	],
});

export const certificateIssuedFileUpload = createUpload({
	folder: 'certificates/issued',
	allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
	allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
});

export const academicServiceAttachmentUpload = createUpload({
	folder: 'academic-services/attachments',
	allowedExtensions: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
	allowedMimeTypes: [
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'image/jpeg',
		'image/png'
	],
});
