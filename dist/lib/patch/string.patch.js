import { _ } from '@utils';
String.prototype.fmt = function (...args) {
    let str = this.toString();
    if (args.length) {
        const t = typeof args[0];
        const params = t === 'string' || t === 'number'
            ? Array.prototype.slice.call(args)
            : args[0];
        // Find all placeholders in the template using regex (case-insensitive)
        const placeholderRegex = /\{([^}]+)\}/gi;
        str = str.replace(placeholderRegex, (match, key) => {
            // Use lodash.get to support nested properties with dot notation
            const value = _.get(params, key);
            // Check if the key exists in params (including undefined values)
            if (_.has(params, key) || value !== undefined) {
                return String(value);
            }
            // Try case-insensitive match if exact key not found
            if (typeof params === 'object' && params !== null) {
                const lowerKey = key.toLowerCase();
                for (const paramKey in params) {
                    if (paramKey.toLowerCase() === lowerKey) {
                        const caseInsensitiveValue = _.get(params, paramKey);
                        return String(caseInsensitiveValue);
                    }
                }
            }
            return match;
        });
    }
    return str;
};
//# sourceMappingURL=string.patch.js.map