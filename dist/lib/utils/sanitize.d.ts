/**
 * Drop the given keys from an object. Shallow by default; pass `{ deep: true }`
 * to strip matching keys anywhere in a nested structure.
 *
 * Default keys: `password`, `hash`, `token`, `secret`.
 */
export declare function sanitize<T extends object>(obj: T, keys?: string[], options?: {
    deep?: boolean;
}): Partial<T>;
/**
 * Replace the values at the given keys with `maskWith` instead of dropping them.
 * Shallow by default; pass `{ deep: true }` for nested structures.
 *
 * Default keys: `password`, `hash`, `token`, `secret`.
 */
export declare function mask<T>(obj: T, keys?: string[], maskWith?: string, options?: {
    deep?: boolean;
}): T;
//# sourceMappingURL=sanitize.d.ts.map