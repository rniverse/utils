// lib/utils/result.ts

export type { Err, Ok, Result } from '../type/result.type';

export function ok(): { ok: true };
export function ok<T>(data: T): { ok: true; data: T };
export function ok<T>(data?: T) {
	return data === undefined ? { ok: true } : { ok: true, data };
}

export function err<E>(error: E): { ok: false; error: E } {
	return { ok: false, error };
}
