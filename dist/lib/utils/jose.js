// lib/utils/jose.ts
//
// Just re-exports the `jose` library so consumers don't add a second direct
// dependency. Use it directly (RS256/JWKS, HS256, whatever you need).
//
// The old `jwt$` HS256-with-shared-secret helpers were removed: nothing used
// them, and a hardcoded shared-secret JWT helper in a shared lib is a footgun.
import * as jwt from 'jose';
export const jose = jwt;
//# sourceMappingURL=jose.js.map