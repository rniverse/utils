import * as jwt from 'jose';
export declare const jose: typeof jwt;
/**
 * Get JWT secret key as Uint8Array
 */
declare const getSecretKey: (s?: string) => NodeJS.NonSharedUint8Array;
export type JWTSignOptions = {
    expiresIn?: number | string;
    alg?: string;
    issuer?: string;
    audience?: string;
    secret?: Uint8Array;
};
export declare const verify: (token: string, options?: Partial<JWTSignOptions>) => Promise<{
    valid: boolean;
    payload: jwt.JWTPayload;
    userId: string;
    orgId: string;
    error?: undefined;
} | {
    payload?: undefined;
    userId?: undefined;
    orgId?: undefined;
    valid: boolean;
    error: string;
}>;
export declare const sign: (payload: any, options?: JWTSignOptions) => Promise<string>;
export declare const jwt$: {
    sign: typeof sign;
    verify: typeof verify;
    getSecretKey: typeof getSecretKey;
};
export {};
//# sourceMappingURL=jose.d.ts.map