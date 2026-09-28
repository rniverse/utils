export type PasswordOptions = {
	/** Default `argon2id`. */
	type?: 'argon2d' | 'argon2i' | 'argon2id';
	/** KiB. Default 65_536 (64 MiB). */
	memoryCost?: number;
	/** Iterations. Default 3. */
	timeCost?: number;
	/** Threads. Default 4. */
	parallelism?: number;
	/** Digest length in bytes. Default 32. */
	hashLength?: number;
};
