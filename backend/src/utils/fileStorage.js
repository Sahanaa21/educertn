"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStoredFile = exports.getStoredFileExtension = exports.resolveLocalStoredPath = exports.getUploadedFileUrl = exports.buildUploadUrl = exports.ensureUploadsDir = exports.getUploadsDir = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DEFAULT_BASE_URL = 'http://localhost:5000';
const getUploadsDir = () => path_1.default.resolve(process.cwd(), 'uploads');
exports.getUploadsDir = getUploadsDir;
const ensureUploadsDir = () => {
    fs_1.default.mkdirSync((0, exports.getUploadsDir)(), { recursive: true });
};
exports.ensureUploadsDir = ensureUploadsDir;
const getBaseUrl = () => {
    return String(process.env.BASE_URL || process.env.BACKEND_PUBLIC_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
};
const normalizeStoredRelativePath = (storedValue) => {
    const normalized = storedValue.replace(/\\/g, '/').trim();
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        try {
            const parsed = new URL(normalized);
            return parsed.pathname.replace(/^\/+/, '').replace(/^uploads\//i, '');
        }
        catch (_a) {
            return path_1.default.basename(normalized);
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
const buildUploadUrl = (relativePath) => {
    const normalizedRelativePath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const encodedPath = normalizedRelativePath
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');
    return `${getBaseUrl()}/uploads/${encodedPath}`;
};
exports.buildUploadUrl = buildUploadUrl;
const getUploadedFileUrl = (file) => {
    if (!file)
        return '';
    const relativePath = file.path
        ? path_1.default.relative((0, exports.getUploadsDir)(), file.path)
        : String(file.filename || file.originalname || '').trim();
    if (!relativePath)
        return '';
    return (0, exports.buildUploadUrl)(relativePath);
};
exports.getUploadedFileUrl = getUploadedFileUrl;
const resolveLocalStoredPath = (storedPath) => {
    if (!storedPath)
        return null;
    const relativePath = normalizeStoredRelativePath(storedPath);
    const candidate = path_1.default.resolve((0, exports.getUploadsDir)(), relativePath);
    if (fs_1.default.existsSync(candidate))
        return candidate;
    const fallbackByName = path_1.default.resolve((0, exports.getUploadsDir)(), path_1.default.basename(relativePath));
    if (fs_1.default.existsSync(fallbackByName))
        return fallbackByName;
    return null;
};
exports.resolveLocalStoredPath = resolveLocalStoredPath;
const getStoredFileExtension = (storedValue) => {
    if (!storedValue)
        return '';
    return path_1.default.extname(normalizeStoredRelativePath(storedValue) || '');
};
exports.getStoredFileExtension = getStoredFileExtension;
const sendStoredFile = (res, storedValue, downloadName) => __awaiter(void 0, void 0, void 0, function* () {
    if (!storedValue)
        return false;
    const resolvedPath = (0, exports.resolveLocalStoredPath)(storedValue);
    if (!resolvedPath)
        return false;
    yield new Promise((resolve, reject) => {
        res.download(resolvedPath, downloadName, (error) => {
            if (error)
                reject(error);
            else
                resolve();
        });
    });
    return true;
});
exports.sendStoredFile = sendStoredFile;
