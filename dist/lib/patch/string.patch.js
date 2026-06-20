// ── Standalone function ──────────────────────────────────
// Use this instead of the prototype patch to avoid global mutation.
// Sames API: fmt(template, params) or fmt(template, ...positional)
import * as lodash from 'es-toolkit/compat';
export const fmt = (template, ...args) => {
    let str = template;
    if (!args.length)
        return str;
    const t = typeof args[0];
    const params = t === 'string' || t === 'number'
        ? Array.prototype.slice.call(args)
        : args[0];
    // Find all placeholders in the template using regex (case-insensitive)
    const placeholderRegex = /\{([^}]+)\}/gi;
    str = str.replace(placeholderRegex, (match, key) => {
        // Use lodash.get to support nested properties with dot notation
        const value = lodash.get(params, key);
        // Check if the key exists in params (including undefined values)
        if (lodash.has(params, key) || value !== undefined) {
            return String(value);
        }
        // Try case-insensitive match if exact key not found
        if (typeof params === 'object' && params !== null) {
            const lowerKey = key.toLowerCase();
            for (const paramKey in params) {
                if (paramKey.toLowerCase() === lowerKey) {
                    const caseInsensitiveValue = lodash.get(params, paramKey);
                    return String(caseInsensitiveValue);
                }
            }
        }
        return match;
    });
    return str;
};
String.prototype.fmt = function (...args) {
    return fmt(this.toString(), ...args);
};
//# sourceMappingURL=string.patch.js.map