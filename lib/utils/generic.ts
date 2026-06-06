export const safeParseInt = (
	value: string,
	base: number,
	radix: number = 10,
): number | null => {
	try {
		const parsed = parseInt(value, radix);
		return Number.isNaN(parsed) ? base : parsed;
	} catch (_error) {
		return base;
	}
};
