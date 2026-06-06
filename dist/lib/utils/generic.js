export const safeParseInt = (value, base, radix = 10) => {
    try {
        const parsed = parseInt(value, radix);
        return Number.isNaN(parsed) ? base : parsed;
    }
    catch (_error) {
        return base;
    }
};
//# sourceMappingURL=generic.js.map