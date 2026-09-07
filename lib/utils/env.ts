// lib/utils/env.ts

/**
 * Read an environment variable. Blank / whitespace-only values are treated as
 * unset, so `''` or `'   '` falls back rather than counting as a real value.
 */
function get(name: string): string | undefined;
function get(name: string, fallback: string): string;
function get(name: string, fallback?: string): string | undefined {
	const value = process.env[name]?.trim();
	return value ? value : fallback;
}

/**
 * Read an environment variable, throwing when it is unset (or blank) and no
 * fallback is provided.
 */
function required(name: string, fallback?: string): string {
	const value = fallback === undefined ? get(name) : get(name, fallback);
	if (value === undefined) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export const environment = { get, required };
