// lib/utils/sanitize.ts

import { MASK_CENSOR, MASK_PROPS } from '../enum/mask.enum';
import { environment } from './env';

/**
 * Secret property names: the `MASK_PROPS` env var (comma-separated) when set,
 * else the built-in `MASK_PROPS` list. The env var replaces the list — it
 * doesn't add to it. Read on every call, so the logger and `sanitize`/`mask`
 * always agree.
 */
export function secrets(): string[] {
	const raw = environment.get('MASK_PROPS');
	if (!raw) return [...MASK_PROPS];
	return raw
		.split(',')
		.map((prop) => prop.trim())
		.filter(Boolean);
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Drop the given keys from an object. Shallow by default; pass `{ deep: true }`
 * to strip matching keys anywhere in a nested structure.
 *
 * Default keys: `secrets()` — the `MASK_PROPS` env var, else the built-in list.
 */
export function sanitize<T extends object>(
	obj: T,
	keys: string[] = secrets(),
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
 * Default keys: `secrets()` — the `MASK_PROPS` env var, else the built-in list.
 */
export function mask<T>(
	obj: T,
	keys: string[] = secrets(),
	maskWith = MASK_CENSOR,
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
