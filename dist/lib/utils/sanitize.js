// lib/utils/sanitize.ts
import { MASK_CENSOR, MASK_PROPS } from '../enum/mask.enum.js';
import { environment } from './env.js';
/**
 * Secret property names: the `MASK_PROPS` env var (comma-separated) when set,
 * else the built-in `MASK_PROPS` list. The env var replaces the list — it
 * doesn't add to it. Read on every call, so the logger and `sanitize`/`mask`
 * always agree.
 */
export function secrets() {
    const raw = environment.get('MASK_PROPS');
    if (!raw)
        return [...MASK_PROPS];
    return raw
        .split(',')
        .map((prop) => prop.trim())
        .filter(Boolean);
}
const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/**
 * Drop the given keys from an object. Shallow by default; pass `{ deep: true }`
 * to strip matching keys anywhere in a nested structure.
 *
 * Default keys: `secrets()` — the `MASK_PROPS` env var, else the built-in list.
 */
export function sanitize(obj, keys = secrets(), options = {}) {
    const drop = new Set(keys);
    const walk = (value) => {
        if (Array.isArray(value))
            return value.map(walk);
        if (!isPlainObject(value))
            return value;
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            if (drop.has(k))
                continue;
            out[k] = options.deep ? walk(v) : v;
        }
        return out;
    };
    return walk(obj);
}
/**
 * Replace the values at the given keys with `maskWith` instead of dropping them.
 * Shallow by default; pass `{ deep: true }` for nested structures.
 *
 * Default keys: `secrets()` — the `MASK_PROPS` env var, else the built-in list.
 */
export function mask(obj, keys = secrets(), maskWith = MASK_CENSOR, options = {}) {
    const hide = new Set(keys);
    const walk = (value) => {
        if (Array.isArray(value))
            return value.map(walk);
        if (!isPlainObject(value))
            return value;
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            if (hide.has(k))
                out[k] = maskWith;
            else
                out[k] = options.deep ? walk(v) : v;
        }
        return out;
    };
    return walk(obj);
}
//# sourceMappingURL=sanitize.js.map