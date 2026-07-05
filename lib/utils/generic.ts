export const safeParseInt = (
	value: unknown,
	fallback = 0,
	radix = 10,
): number => {
	const parsed = Number.parseInt(String(value ?? ''), radix);
	return Number.isNaN(parsed) ? fallback : parsed;
};

export const boundedParseInt = (
	value: unknown,
	{
		min,
		max,
		fallback = 0,
	}: {
		min?: number;
		max?: number;
		fallback?: number;
	},
): number => {
	const parsed = safeParseInt(value, fallback);

	if (min !== undefined && parsed < min) return min;
	if (max !== undefined && parsed > max) return max;

	return parsed;
};

export const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const isBun = () => typeof Bun !== 'undefined' && process.versions.bun;
