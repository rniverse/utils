export const safeParseInt = (
	value: string,
	base: number,
	radix: number = 10,
): number | null => {
	try {
		const parsed = parseInt(value, radix);
		return isNaN(parsed) ? base : parsed;
	} catch (error) {
		return base;
	}
};
