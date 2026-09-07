// NOTE: `Math.random()` — statistically fine for jitter, sampling, test
// fixtures, non-security shuffling. It is NOT cryptographically secure and its
// output is predictable given enough samples. For anything security-sensitive
// (tokens, codes, secrets, nonces, secure selection) use `crypto.ts`
// (`randomToken`, `randomInt`), never this.

export function getRandomInt(min: number, max: number): number {
	min = Math.ceil(min); // Ensure min is an integer
	max = Math.floor(max); // Ensure max is an integer
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

export const random = {
	int: getRandomInt,
	float: getRandomFloat,
};
