"use strict";
/**
 * Input Validation & Sanitization Utilities
 *
 * Provides safe validation and sanitization for common input types.
 * Use these functions to validate all user inputs before processing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateObject = exports.isValidationError = exports.sanitizeHtml = exports.validateEnum = exports.validateFileName = exports.validatePhoneNumber = exports.validateUrl = exports.validateNumber = exports.validateString = exports.validateEmail = void 0;
/**
 * Validates and sanitizes email addresses
 */
const validateEmail = (email) => {
    const sanitized = String(email || '').trim().toLowerCase();
    // RFC 5322 simplified email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!sanitized || !emailRegex.test(sanitized)) {
        return { field: 'email', message: 'Invalid email format' };
    }
    if (sanitized.length > 255) {
        return { field: 'email', message: 'Email too long (max 255 characters)' };
    }
    return sanitized;
};
exports.validateEmail = validateEmail;
/**
 * Validates and sanitizes strings (removes dangerous characters)
 */
const validateString = (value, options = {}) => {
    const { minLength = 0, maxLength = 10000, pattern, allowHtml = false, } = options;
    let sanitized = String(value || '').trim();
    // Remove potentially dangerous HTML/JavaScript if not explicitly allowed
    if (!allowHtml) {
        sanitized = sanitized
            .replace(/[<>]/g, '') // Strip angle brackets
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, ''); // Strip event handlers
    }
    if (sanitized.length < minLength) {
        return {
            field: 'string',
            message: `Must be at least ${minLength} characters`,
        };
    }
    if (sanitized.length > maxLength) {
        return {
            field: 'string',
            message: `Must be no more than ${maxLength} characters`,
        };
    }
    if (pattern && !pattern.test(sanitized)) {
        return {
            field: 'string',
            message: 'Invalid format',
        };
    }
    return sanitized;
};
exports.validateString = validateString;
/**
 * Validates and sanitizes numbers
 */
const validateNumber = (value, options = {}) => {
    const { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, integer = false } = options;
    const num = Number(value);
    if (isNaN(num)) {
        return { field: 'number', message: 'Must be a valid number' };
    }
    if (integer && !Number.isInteger(num)) {
        return { field: 'number', message: 'Must be an integer' };
    }
    if (num < min || num > max) {
        return { field: 'number', message: `Must be between ${min} and ${max}` };
    }
    return num;
};
exports.validateNumber = validateNumber;
/**
 * Validates and sanitizes URLs
 */
const validateUrl = (value) => {
    const sanitized = String(value || '').trim();
    try {
        const url = new URL(sanitized);
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
            return { field: 'url', message: 'Only HTTP(S) URLs are allowed' };
        }
        return url.href;
    }
    catch (_a) {
        return { field: 'url', message: 'Invalid URL format' };
    }
};
exports.validateUrl = validateUrl;
/**
 * Validates phone numbers (basic format)
 */
const validatePhoneNumber = (value) => {
    const sanitized = String(value || '').replace(/\D/g, '');
    if (sanitized.length < 10 || sanitized.length > 15) {
        return {
            field: 'phone',
            message: 'Phone number must be between 10-15 digits',
        };
    }
    return sanitized;
};
exports.validatePhoneNumber = validatePhoneNumber;
/**
 * Validates and sanitizes file names (prevents directory traversal)
 */
const validateFileName = (value) => {
    const sanitized = String(value || '').trim();
    // Block directory traversal attempts
    if (sanitized.includes('/') || sanitized.includes('\\') || sanitized.includes('..')) {
        return {
            field: 'filename',
            message: 'Invalid filename',
        };
    }
    // Only allow alphanumeric, dots, hyphens, underscores
    if (!/^[a-z0-9._-]+$/i.test(sanitized)) {
        return {
            field: 'filename',
            message: 'Filename contains invalid characters',
        };
    }
    return sanitized;
};
exports.validateFileName = validateFileName;
/**
 * Validates enum values
 */
const validateEnum = (value, allowedValues) => {
    const sanitized = String(value || '').trim();
    if (!allowedValues.includes(sanitized)) {
        return {
            field: 'enum',
            message: `Must be one of: ${allowedValues.join(', ')}`,
        };
    }
    return sanitized;
};
exports.validateEnum = validateEnum;
/**
 * Sanitizes HTML by escaping dangerous characters
 */
const sanitizeHtml = (value) => {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};
exports.sanitizeHtml = sanitizeHtml;
/**
 * Checks if a value is a validation error
 */
const isValidationError = (value) => {
    return (typeof value === 'object' &&
        value !== null &&
        'field' in value &&
        'message' in value);
};
exports.isValidationError = isValidationError;
/**
 * Validates an object against a schema
 */
const validateObject = (obj, schema) => {
    if (typeof obj !== 'object' || obj === null) {
        return { errors: [{ field: 'root', message: 'Input must be an object' }] };
    }
    const errors = [];
    const data = {};
    for (const [key, validator] of Object.entries(schema)) {
        const value = obj[key];
        const result = validator(value);
        if ((0, exports.isValidationError)(result)) {
            errors.push(result);
        }
        else {
            data[key] = result;
        }
    }
    if (errors.length > 0) {
        return { errors };
    }
    return { data, errors: [] };
};
exports.validateObject = validateObject;
