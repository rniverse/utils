import type { DestinationStream } from 'pino';

export type LoggerOptions = {
	/** Default: `LOG_LEVEL` env, else `info`. */
	level?: string;
	/**
	 * Human-readable output instead of JSON. Default: on when `NODE_ENV=test`,
	 * `LOG_PRETTY=true`, or stdout is a terminal.
	 */
	pretty?: boolean;
	/**
	 * Property names to mask, at the top level and up to two levels deep.
	 * Default: `secrets()` — `MASK_PROPS` env, else the built-in list.
	 */
	redact?: string[];
	/** Where to write. Default: stdout. */
	destination?: DestinationStream;
};
