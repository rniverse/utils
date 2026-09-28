export type SleepOptions = { signal?: AbortSignal };

/** A value loaded once and shared — see `lazy`. */
export type Lazy<T> = {
	get(): Promise<T>;
	reset(): void;
};
