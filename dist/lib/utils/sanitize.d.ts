/**
 * Secret property names: the `MASK_PROPS` env var (comma-separated) when set,
 * else the built-in `MASK_PROPS` list. The env var replaces the list — it
 * doesn't add to it. Read on every call, so the logger and `sanitize`/`mask`
 * always agree.
 */
export declare function secrets(): string[];
/**
 * Drop the given keys from an object. Shallow by default; pass `{ deep: true }`
 * to strip matching keys anywhere in a nested structure.
 *
 * Default keys: `secrets()` — the `MASK_PROPS` env var, else the built-in list.
 */
export declare function sanitize<T extends object>(obj: T, keys?: string[], options?: {
    deep?: boolean;
}): Partial<T>;
/**
 * Replace the values at the given keys with `maskWith` instead of dropping them.
 * Shallow by default; pass `{ deep: true }` for nested structures.
 *
 * Default keys: `secrets()` — the `MASK_PROPS` env var, else the built-in list.
 */
export declare function mask<T>(obj: T, keys?: string[], maskWith?: string, options?: {
    deep?: boolean;
}): T;
//# sourceMappingURL=sanitize.d.ts.map