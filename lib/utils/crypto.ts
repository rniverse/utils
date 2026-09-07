// lib/utils/crypto.ts
// Small Web Crypto helpers. No dependencies — `crypto` is a global in Bun and
// Node >= 20.

/** Cryptographically-random opaque token, base64url-encoded. */
export function randomToken(bytes = 32): string {
	const buffer = new Uint8Array(bytes);
	crypto.getRandomValues(buffer);
	return Buffer.from(buffer).toString('base64url');
}

/**
 * Cryptographically-secure random integer in `[min, max]` (inclusive), with no
 * modulo bias. Use this over `random.int` for anything security-sensitive —
 * one-time codes, secure selection, shuffles.
 */
export function randomInt(min: number, max: number): number {
	const lo = Math.ceil(min);
	const hi = Math.floor(max);
	if (hi < lo) throw new RangeError('randomInt: max must be >= min');

	const range = hi - lo + 1;
	if (range === 1) return lo;

	// Reject the final partial bucket so every value is equally likely.
	const maxUint = 0xffffffff;
	const limit = maxUint - ((maxUint + 1) % range);
	const buffer = new Uint32Array(1);
	let n: number;
	do {
		crypto.getRandomValues(buffer);
		n = buffer[0] ?? 0;
	} while (n > limit);

	return lo + (n % range);
}

/** SHA-256 of `value`, hex-encoded. Handy for storing a lookup hash of a token. */
export async function sha256hex(value: string): Promise<string> {
	const encoded = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest('SHA-256', encoded);
	return Buffer.from(digest).toString('hex');
}
