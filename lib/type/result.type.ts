export type Ok<T = unknown> = { ok: true; data: T };
export type Err<E = unknown> = { ok: false; error: E };

/** Discriminated success/failure. `data` is absent on the no-payload success. */
export type Result<T = unknown, E = unknown> =
	| { ok: true; data?: T }
	| { ok: false; error: E };
