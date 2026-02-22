import * as jwt from 'jose';

export const jose = jwt;

const JWT_SECRET =
	process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_ISSUER = 'rnivguard';
const JWT_AUDIENCE = 'rnivguard-users';
const JWT_EXPIRES_IN = '3600'; // in seconds
/**
 * Get JWT secret key as Uint8Array
 */
const getSecretKey = (s = JWT_SECRET) => new TextEncoder().encode(s);

export type JWTSignOptions = {
	expiresIn?: number | string; // in seconds
	alg?: string;
	issuer?: string;
	audience?: string;
	secret?: Uint8Array;
};

export const verify = async (
	token: string,
	options?: Partial<JWTSignOptions>,
) => {
	const {
		audience = JWT_AUDIENCE,
		issuer = JWT_ISSUER,
		secret = getSecretKey(),
	} = options || {};
	try {
		const { payload } = await jose.jwtVerify(token, secret, {
			issuer,
			audience,
		});

		return {
			valid: true,
			payload,
			userId: payload.sub as string,
			orgId: payload.org as string,
		};
	} catch (error) {
		// Token is invalid, expired, or tampered
		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Invalid token',
		};
	}
};

export const sign = (
	payload: any,
	options?: JWTSignOptions,
): Promise<string> => {
	const {
		expiresIn = JWT_EXPIRES_IN,
		secret = getSecretKey(),
		alg = 'HS256',
		issuer = JWT_ISSUER,
		audience = JWT_AUDIENCE,
	} = options || {};
	// const expiresIn = type === 'refresh_token' ? JWT_REFRESH_EXPIRES_IN : JWT_ACCESS_EXPIRES_IN;
	return new jose.SignJWT(payload)
		.setProtectedHeader({ alg }) // HMAC SHA-256 algorithm
		.setIssuedAt() // Set issued at timestamp
		.setExpirationTime(`${expiresIn}s`) // Expires in 7 days
		.setIssuer(issuer) // Issuer
		.setAudience(audience) // Audience
		.sign(secret);
};

export const jwt$ = {
	sign,
	verify,
	getSecretKey,
};
