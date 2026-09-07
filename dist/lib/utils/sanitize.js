// lib/utils/sanitize.ts
const DEFAULT_KEYS = ['password', 'hash', 'token', 'secret'];
const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/**
 * Drop the given keys from an object. Shallow by default; pass `{ deep: true }`
 * to strip matching keys anywhere in a nested structure.
 *
 * Default keys: `password`, `hash`, `token`, `secret`.
 */
export function sanitize(obj, keys = DEFAULT_KEYS, options = {}) {
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
 * Default keys: `password`, `hash`, `token`, `secret`.
 */
export function mask(obj, keys = DEFAULT_KEYS, maskWith = '***', options = {}) {
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