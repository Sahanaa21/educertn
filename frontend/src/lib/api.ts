export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

type ApiFetchOptions = {
	timeoutMs?: number;
	retries?: number;
	retryDelayMs?: number;
};

export const apiUrl = (path: string) => `${API_BASE}${path}`;

export async function apiFetch(
	path: string,
	init: RequestInit = {},
	options: ApiFetchOptions = {}
): Promise<Response> {
	const {
		timeoutMs = 12000,
		retries = 1,
		retryDelayMs = 300,
	} = options;

	const target = path.startsWith('http') ? path : apiUrl(path);
	let attempt = 0;
	let lastError: unknown;

	while (attempt <= retries) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const response = await fetch(target, { ...init, signal: controller.signal });
			clearTimeout(timeoutId);

			// Retry for transient 5xx failures only.
			if (response.status >= 500 && response.status < 600 && attempt < retries) {
				await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
				attempt += 1;
				continue;
			}

			return response;
		} catch (error) {
			clearTimeout(timeoutId);
			lastError = error;
			if (attempt >= retries) break;
			await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
			attempt += 1;
		}
	}

	throw lastError instanceof Error ? lastError : new Error('Request failed');
}
