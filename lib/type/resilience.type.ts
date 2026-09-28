import type { CircuitBreaker } from '../utils/resilience/circuit-breaker';
import type { Err, Ok } from './result.type';

/** How a call went: `work` resolved (`data`) or threw (`error`). */
export type Outcome<T> = Ok<T> | Err;

/** What `retry`/`resilient` hand to `work` on each attempt. */
export type Attempt = { attempt: number; signal: AbortSignal };

export type Backoff = {
	strategy: 'fixed' | 'exponential' | 'jitter';
	/** ms — the first wait, what exponential doubles from, and the floor. */
	min: number;
	/** ms — the ceiling. */
	max: number;
};

export type RetryContext = {
	/** The attempt that just finished, 1-based. */
	attempt: number;
	/** Total allowed, including the first. */
	attempts: number;
	/** ms the next wait will be, if the predicate says retry. */
	delay: number;
	/** ms since the first attempt started. */
	elapsed: number;
};

export type RetryOptions<T> = {
	/** Total calls, INCLUDING the first. Default 1 — retry is opt-in. */
	attempts?: number;
	backoff?: Partial<Backoff>;
	/** Sees resolved values and thrown errors. Default: retry errors only. */
	retryable?: (
		result: Outcome<T>,
		context: RetryContext,
	) => boolean | Promise<boolean>;
	signal?: AbortSignal;
	on?: {
		retry?: (event: RetryContext & { result: Outcome<T> }) => void;
	};
};

export type BreakerState = 'closed' | 'open' | 'half-open';

/** The half-open trial in flight: when it started, and the token that owns the slot. Internal to `CircuitBreaker`. */
export type BreakerTrial = { startedAt: number; token: symbol };

/** Options for `CircuitBreaker.run` / `trial`. */
export type BreakerRunOptions = { signal?: AbortSignal };

/** Options for `CircuitBreaker.open`. */
export type BreakerOpenOptions = {
	/** ms to stay open. Default: the breaker's `cooldown`. */
	ms?: number;
};

export type BreakerOptions = {
	/** Consecutive counted failures that open the circuit. Default 5. */
	threshold?: number;
	/** ms to stay open before one trial call is allowed. Default 30_000. */
	cooldown?: number;
	/** Does this outcome count as a dependency failure? Default: every error. */
	trips?: (result: Outcome<unknown>) => boolean | Promise<boolean>;
	on?: {
		open?: (event: { failures: number; cooldown: number }) => void;
		/** Entering half-open; `since` = ms it was open. */
		trial?: (event: { since: number }) => void;
		/** Back to normal; `since` = ms it wasn't closed. */
		close?: (event: { since: number }) => void;
	};
};

export type ResilientOptions<T> = {
	/** ms. `total` bounds everything incl. retry waits; `attempt` bounds each call. */
	timeout?: { total?: number; attempt?: number };
	/** No `signal` here — the one `signal` is top-level. */
	retry?: Omit<RetryOptions<T>, 'signal'>;
	breaker?: CircuitBreaker;
	signal?: AbortSignal;
};
