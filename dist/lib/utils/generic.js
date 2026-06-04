export const safeParseInt = (value, base, radix = 10) => {
    try {
        const parsed = parseInt(value, radix);
        return isNaN(parsed) ? base : parsed;
    }
    catch (error) {
        return base;
    }
};
//# sourceMappingURL=generic.js.map