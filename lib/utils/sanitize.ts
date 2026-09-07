// lib/utils/sanitize.ts

const DEFAULT_KEYS = ['password', 'hash', 'token', 'secret'];

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Drop the given keys from an object. Shallow by default; pass `{ deep: true }`
 * to strip matching keys anywhere in a nested structure.
 *
 * Default keys: `password`, `hash`, `token`, `secret`.
 */
export function sanitize<T extends object>(
	obj: T,
	keys: string[] = DEFAULT_KEYS,
	options: { deep?: boolean } = {},
): Partial<T> {
	const drop = new Set(keys);

	const walk = (value: unknown): unknown => {
		if (Array.isArray(value)) return value.map(walk);
		if (!isPlainObject(value)) return value;
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			if (drop.has(k)) continue;
			out[k] = options.deep ? walk(v) : v;
		}
		return out;
	};

	return walk(obj) as Partial<T>;
}

/**
 * Replace the values at the given keys with `maskWith` instead of dropping them.
 * Shallow by default; pass `{ deep: true }` for nested structures.
 *
 * Default keys: `password`, `hash`, `token`, `secret`.
 */
export function mask<T>(
	obj: T,
	keys: string[] = DEFAULT_KEYS,
	maskWith = '***',
	options: { deep?: boolean } = {},
): T {
	const hide = new Set(keys);

	const walk = (value: unknown): unknown => {
		if (Array.isArray(value)) return value.map(walk);
		if (!isPlainObject(value)) return value;
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			if (hide.has(k)) out[k] = maskWith;
			else out[k] = options.deep ? walk(v) : v;
		}
		return out;
	};

	return walk(obj) as T;
}
