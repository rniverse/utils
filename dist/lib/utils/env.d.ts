/**
 * Read an environment variable. Blank / whitespace-only values are treated as
 * unset, so `''` or `'   '` falls back rather than counting as a real value.
 */
declare function get(name: string): string | undefined;
declare function get(name: string, fallback: string): string;
/**
 * Read an environment variable, throwing when it is unset (or blank) and no
 * fallback is provided.
 */
declare function required(name: string, fallback?: string): string;
export declare const environment: {
    get: typeof get;
    required: typeof required;
};
export {};
//# sourceMappingURL=env.d.ts.map