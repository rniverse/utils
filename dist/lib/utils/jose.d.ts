import * as jwt from 'jose';
export declare const jose: typeof jwt;
export type JWTSignOptions = {
	expiresIn?: number | string;
	alg?: string;
	issuer?: string;
	audience?: string;
	secret?: Uint8Array;
};
export declare const verify: (
	token: string,
	options?: Partial<JWTSignOptions>,
) => Promise<
	| {
			valid: boolean;
			payload: jwt.JWTPayload;
			userId: string;
			orgId: string;
			error?: undefined;
	  }
	| {
			valid: boolean;
			error: string;
			payload?: undefined;
			userId?: undefined;
			orgId?: undefined;
	  }
>;
export declare const sign: (
	payload: any,
	options?: JWTSignOptions,
) => Promise<string>;
export declare const jwt$: {
	sign: (payload: any, options?: JWTSignOptions) => Promise<string>;
	verify: (
		token: string,
		options?: Partial<JWTSignOptions>,
	) => Promise<
		| {
				valid: boolean;
				payload: jwt.JWTPayload;
				userId: string;
				orgId: string;
				error?: undefined;
		  }
		| {
				valid: boolean;
				error: string;
				payload?: undefined;
				userId?: undefined;
				orgId?: undefined;
		  }
	>;
	getSecretKey: (s?: string) => NodeJS.NonSharedUint8Array;
};
//# sourceMappingURL=jose.d.ts.map
