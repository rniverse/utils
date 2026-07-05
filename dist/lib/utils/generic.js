export const safeParseInt = (value, fallback = 0, radix = 10) => {
    const parsed = Number.parseInt(String(value ?? ''), radix);
    return Number.isNaN(parsed) ? fallback : parsed;
};
export const boundedParseInt = (value, { min, max, fallback = 0, }) => {
    const parsed = safeParseInt(value, fallback);
    if (min !== undefined && parsed < min)
        return min;
    if (max !== undefined && parsed > max)
        return max;
    return parsed;
};
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
//# sourceMappingURL=generic.js.map