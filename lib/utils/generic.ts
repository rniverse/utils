export const safeParseInt = (
	value: string | undefined,
	base: number,
	radix: number = 10,
): number => {
	try {
		const parsed = parseInt(value || '', radix);
		return Number.isNaN(parsed) ? base : parsed;
	} catch (_error) {
		return base;
	}
};
