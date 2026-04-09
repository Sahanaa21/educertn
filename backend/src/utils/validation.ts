/**
 * Input Validation & Sanitization Utilities
 * 
 * Provides safe validation and sanitization for common input types.
 * Use these functions to validate all user inputs before processing.
 */

export interface ValidationError {
    field: string;
    message: string;
}

/**
 * Validates and sanitizes email addresses
 */
export const validateEmail = (email: unknown): string | ValidationError => {
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

/**
 * Validates and sanitizes strings (removes dangerous characters)
 */
export const validateString = (
    value: unknown,
    options: {
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
        allowHtml?: boolean;
    } = {}
): string | ValidationError => {
    const {
        minLength = 0,
        maxLength = 10000,
        pattern,
        allowHtml = false,
    } = options;

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

/**
 * Validates and sanitizes numbers
 */
export const validateNumber = (
    value: unknown,
    options: {
        min?: number;
        max?: number;
        integer?: boolean;
    } = {}
): number | ValidationError => {
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

/**
 * Validates and sanitizes URLs
 */
export const validateUrl = (value: unknown): string | ValidationError => {
    const sanitized = String(value || '').trim();

    try {
        const url = new URL(sanitized);
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
            return { field: 'url', message: 'Only HTTP(S) URLs are allowed' };
        }
        return url.href;
    } catch {
        return { field: 'url', message: 'Invalid URL format' };
    }
};

/**
 * Validates phone numbers (basic format)
 */
export const validatePhoneNumber = (value: unknown): string | ValidationError => {
    const sanitized = String(value || '').replace(/\D/g, '');

    if (sanitized.length < 10 || sanitized.length > 15) {
        return {
            field: 'phone',
            message: 'Phone number must be between 10-15 digits',
        };
    }

    return sanitized;
};

/**
 * Validates and sanitizes file names (prevents directory traversal)
 */
export const validateFileName = (value: unknown): string | ValidationError => {
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

/**
 * Validates enum values
 */
export const validateEnum = (
    value: unknown,
    allowedValues: readonly string[]
): string | ValidationError => {
    const sanitized = String(value || '').trim();

    if (!allowedValues.includes(sanitized)) {
        return {
            field: 'enum',
            message: `Must be one of: ${allowedValues.join(', ')}`,
        };
    }

    return sanitized;
};

/**
 * Sanitizes HTML by escaping dangerous characters
 */
export const sanitizeHtml = (value: unknown): string => {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

/**
 * Checks if a value is a validation error
 */
export const isValidationError = (value: unknown): value is ValidationError => {
    return (
        typeof value === 'object' &&
        value !== null &&
        'field' in value &&
        'message' in value
    );
};

/**
 * Validates an object against a schema
 */
export const validateObject = <T extends Record<string, any>>(
    obj: unknown,
    schema: Record<keyof T, (value: unknown) => any | ValidationError>
): { data: T; errors: ValidationError[] } | { errors: ValidationError[] } => {
    if (typeof obj !== 'object' || obj === null) {
        return { errors: [{ field: 'root', message: 'Input must be an object' }] };
    }

    const errors: ValidationError[] = [];
    const data: any = {};

    for (const [key, validator] of Object.entries(schema)) {
        const value = (obj as Record<string, any>)[key];
        const result = validator(value);

        if (isValidationError(result)) {
            errors.push(result);
        } else {
            data[key] = result;
        }
    }

    if (errors.length > 0) {
        return { errors };
    }

    return { data, errors: [] };
};
