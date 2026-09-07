// lib/utils/env.ts
function get(name, fallback) {
    const value = process.env[name]?.trim();
    return value ? value : fallback;
}
/**
 * Read an environment variable, throwing when it is unset (or blank) and no
 * fallback is provided.
 */
function required(name, fallback) {
    const value = fallback === undefined ? get(name) : get(name, fallback);
    if (value === undefined) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
export const environment = { get, required };
//# sourceMappingURL=env.js.map