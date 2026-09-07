export type { Err, Ok, Result } from '../type/result.type.js';
export declare function ok(): {
    ok: true;
};
export declare function ok<T>(data: T): {
    ok: true;
    data: T;
};
export declare function err<E>(error: E): {
    ok: false;
    error: E;
};
//# sourceMappingURL=result.d.ts.map