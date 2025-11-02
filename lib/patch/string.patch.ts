import { _ } from "@utils";

declare global {
	interface String {
		fmt(...args: any[]): string;
	}
}
String.prototype.fmt = function (...args: any[]): string {
	let str = this.toString();
	if (args.length) {
		const t = typeof args[0];
		const params: any =
			t === "string" || t === "number"
				? Array.prototype.slice.call(args)
				: args[0];

		// Find all placeholders in the template using regex (case-insensitive)
		const placeholderRegex = /\{([^}]+)\}/gi;
		str = str.replace(placeholderRegex, (match, key) => {
			// Use lodash.get to support nested properties with dot notation
			const value = _.get(params, key);
			// Check if the key exists in params (including undefined values)
			if (_.has(params, key) || value !== undefined) {
				return String(value);
			}
			// Try case-insensitive match if exact key not found
			if (typeof params === "object" && params !== null) {
				const lowerKey = key.toLowerCase();
				for (const paramKey in params as any) {
					if (paramKey.toLowerCase() === lowerKey) {
						const caseInsensitiveValue = _.get(params, paramKey);
						return String(caseInsensitiveValue);
					}
				}
			}
			return match;
		});
	}
	return str;
};
