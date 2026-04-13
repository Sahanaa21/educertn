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
exports.sendStoredFile = exports.getStoredFileExtension = exports.resolveLocalStoredPath = exports.isRemoteFileUrl = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("stream/promises");
const stream_1 = require("stream");
const isRemoteFileUrl = (value) => {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
};
exports.isRemoteFileUrl = isRemoteFileUrl;
const resolveLocalStoredPath = (storedPath) => {
    if (!storedPath)
        return null;
    const direct = path_1.default.isAbsolute(storedPath) ? storedPath : path_1.default.resolve(process.cwd(), storedPath);
    if (fs_1.default.existsSync(direct))
        return direct;
    const normalized = storedPath.replace(/\\/g, '/');
    const uploadsIndex = normalized.lastIndexOf('/uploads/');
    if (uploadsIndex >= 0) {
        const relativeFromUploads = normalized.slice(uploadsIndex + 1);
        const candidate = path_1.default.resolve(process.cwd(), relativeFromUploads);
        if (fs_1.default.existsSync(candidate))
            return candidate;
    }
    const fallbackByName = path_1.default.resolve(process.cwd(), 'uploads', path_1.default.basename(normalized));
    if (fs_1.default.existsSync(fallbackByName))
        return fallbackByName;
    return null;
};
exports.resolveLocalStoredPath = resolveLocalStoredPath;
const getStoredFileExtension = (storedValue) => {
    if (!storedValue)
        return '';
    if ((0, exports.isRemoteFileUrl)(storedValue)) {
        try {
            return path_1.default.extname(new URL(storedValue).pathname);
        }
        catch (_a) {
            return '';
        }
    }
    return path_1.default.extname((0, exports.resolveLocalStoredPath)(storedValue) || storedValue || '');
};
exports.getStoredFileExtension = getStoredFileExtension;
const sendStoredFile = (res, storedValue, downloadName) => __awaiter(void 0, void 0, void 0, function* () {
    if (!storedValue)
        return false;
    if ((0, exports.isRemoteFileUrl)(storedValue)) {
        const response = yield fetch(storedValue);
        if (!response.ok || !response.body) {
            throw new Error(`Unable to fetch remote file (${response.status})`);
        }
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
        yield (0, promises_1.pipeline)(stream_1.Readable.fromWeb(response.body), res);
        return true;
    }
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
