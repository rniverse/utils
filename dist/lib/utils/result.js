// lib/utils/result.ts
export function ok(data) {
    return data === undefined ? { ok: true } : { ok: true, data };
}
export function err(error) {
    return { ok: false, error };
}
//# sourceMappingURL=result.js.map