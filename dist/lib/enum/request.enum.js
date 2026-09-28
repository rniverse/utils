/**
 * Pattern an inbound `x-request-id` must match to be adopted (`trace$.seed`);
 * anything else is ignored and a fresh id is generated. Overridden by the
 * `SAFE_REQUEST_ID_REGEX` env var.
 */
export const SAFE_REQUEST_ID_REGEX = '^[A-Za-z0-9._-]{1,128}$';
//# sourceMappingURL=request.enum.js.map