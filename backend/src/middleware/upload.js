"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.academicServiceAttachmentUpload = exports.certificateIssuedFileUpload = exports.verificationCompletedFileUpload = exports.verificationTemplateUpload = exports.certificateIdProofUpload = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fileStorage_1 = require("../utils/fileStorage");
dotenv_1.default.config();
const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const sanitizeFileName = (originalname) => {
    const parsed = path_1.default.parse(originalname || 'file');
    const baseName = parsed.name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
    const extension = parsed.ext.toLowerCase() || '.bin';
    return `${Date.now()}-${baseName}${extension}`;
};
const createUpload = ({ folder, allowedExtensions, allowedMimeTypes, maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES, }) => (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            (0, fileStorage_1.ensureUploadsDir)();
            const destination = path_1.default.resolve((0, fileStorage_1.getUploadsDir)(), folder);
            fs_1.default.mkdirSync(destination, { recursive: true });
            cb(null, destination);
        },
        filename: (_req, file, cb) => {
            cb(null, sanitizeFileName(file.originalname || 'file'));
        },
    }),
    limits: { fileSize: maxFileSizeBytes },
    fileFilter: (_req, file, cb) => {
        if (!(allowedExtensions === null || allowedExtensions === void 0 ? void 0 : allowedExtensions.length) && !(allowedMimeTypes === null || allowedMimeTypes === void 0 ? void 0 : allowedMimeTypes.length)) {
            cb(null, true);
            return;
        }
        const ext = path_1.default.extname(file.originalname || '').toLowerCase();
        const isValidExt = !(allowedExtensions === null || allowedExtensions === void 0 ? void 0 : allowedExtensions.length) || allowedExtensions.includes(ext);
        const isValidMime = !(allowedMimeTypes === null || allowedMimeTypes === void 0 ? void 0 : allowedMimeTypes.length) || allowedMimeTypes.includes(file.mimetype);
        if (isValidExt || isValidMime) {
            cb(null, true);
            return;
        }
        cb(new Error('Invalid file type'));
    }
});
exports.certificateIdProofUpload = createUpload({
    folder: 'certificates/id-proofs',
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
});
exports.verificationTemplateUpload = createUpload({
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
exports.verificationCompletedFileUpload = createUpload({
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
exports.certificateIssuedFileUpload = createUpload({
    folder: 'certificates/issued',
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
});
exports.academicServiceAttachmentUpload = createUpload({
    folder: 'academic-services/attachments',
});
