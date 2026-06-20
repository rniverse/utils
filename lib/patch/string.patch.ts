// ── Standalone function ──────────────────────────────────
// Use this instead of the prototype patch to avoid global mutation.
// Sames API: fmt(template, params) or fmt(template, ...positional)

import * as lodash from 'es-toolkit/compat';

export const fmt = (template: string, ...args: any[]): string => {
	let str = template;
	if (!args.length) return str;

	const t = typeof args[0];
	const params: any =
		t === 'string' || t === 'number'
			? Array.prototype.slice.call(args)
			: args[0];

	// Find all placeholders in the template using regex (case-insensitive)
	const placeholderRegex = /\{([^}]+)\}/gi;
	str = str.replace(placeholderRegex, (match, key) => {
		// Use lodash.get to support nested properties with dot notation
		const value = lodash.get(params, key);
		// Check if the key exists in params (including undefined values)
		if (lodash.has(params, key) || value !== undefined) {
			return String(value);
		}
		// Try case-insensitive match if exact key not found
		if (typeof params === 'object' && params !== null) {
			const lowerKey = key.toLowerCase();
			for (const paramKey in params as any) {
				if (paramKey.toLowerCase() === lowerKey) {
					const caseInsensitiveValue = lodash.get(params, paramKey);
					return String(caseInsensitiveValue);
				}
			}
		}
		return match;
	});

	return str;
};

// ── Prototype patch (optional, opt-in via import) ────────
// Import '@rniverse/utils/lib/patch' to enable.
// Prefer the standalone fmt() for new code.

declare global {
	interface String {
		fmt(...args: any[]): string;
	}
}

String.prototype.fmt = function (...args: any[]): string {
	return fmt(this.toString(), ...args);
};
