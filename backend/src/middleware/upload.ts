import dotenv from 'dotenv';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { s3Client } from '../utils/s3';

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
	storage: multerS3({
		s3: s3Client,
		bucket: process.env.AWS_BUCKET_NAME || '',
		contentType: multerS3.AUTO_CONTENT_TYPE,
		acl: 'public-read',
		key: (_req, file, cb) => {
			cb(null, `${folder}/${sanitizeFileName(file.originalname || 'file')}`);
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

		if (isValidExt || isValidMime) {
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
});
