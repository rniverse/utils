import { describe, expect, test } from "bun:test";
import "../lib/patch/string.patch";

describe("String.prototype.fmt", () => {
	test("should replace placeholders with object properties", () => {
		const result = "Hello {name}, you are {age} years old".fmt({
			name: "John",
			age: 30,
		});
		expect(result).toBe("Hello John, you are 30 years old");
	});

	test("should handle nested object properties", () => {
		const result = "User: {user}, Role: {role}".fmt({
			user: "Alice",
			role: "Admin",
		});
		expect(result).toBe("User: Alice, Role: Admin");
	});

	test("should handle nested object properties with dot notation", () => {
		const result = "User: {user.name}, Email: {user.email}".fmt({
			user: { name: "Alice", email: "alice@example.com" },
		});
		expect(result).toBe("User: Alice, Email: alice@example.com");
	});

	test("should handle deeply nested properties with dot notation", () => {
		const result = "Value: {data.user.profile.age}".fmt({
			data: { user: { profile: { age: 25 } } },
		});
		expect(result).toBe("Value: 25");
	});

	test("should handle array index access in nested properties", () => {
		const result = "First: {users.0.name}, Second: {users.1.name}".fmt({
			users: [{ name: "John" }, { name: "Jane" }],
		});
		expect(result).toBe("First: John, Second: Jane");
	});

	test("should work with array arguments (positional)", () => {
		const result = "First: {0}, Second: {1}, Third: {2}".fmt(
			"one",
			"two",
			"three",
		);
		expect(result).toBe("First: one, Second: two, Third: three");
	});

	test("should handle numeric values", () => {
		// Using a dollar sign before a curly brace (not template literal syntax)
		// biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string that looks like template
		const template = "Price: ${price}, Quantity: {quantity}";
		const result = template.fmt({
			price: 19.99,
			quantity: 5,
		});
		expect(result).toBe("Price: $19.99, Quantity: 5");
	});

	test("should be case insensitive for placeholders", () => {
		const result = "Hello {NAME}".fmt({ name: "World" });
		expect(result).toBe("Hello World");
	});

	test("should handle multiple occurrences of the same placeholder", () => {
		const result = "{name} likes {name}'s code".fmt({ name: "Bob" });
		expect(result).toBe("Bob likes Bob's code");
	});

	test("should return original string if no arguments provided", () => {
		const result = "Hello {name}".fmt();
		expect(result).toBe("Hello {name}");
	});

	test("should handle empty object", () => {
		const result = "Hello {name}".fmt({});
		expect(result).toBe("Hello {name}");
	});

	test("should handle special characters in values", () => {
		const result = "Regex: {pattern}".fmt({ pattern: "\\d+" });
		expect(result).toBe("Regex: \\d+");
	});

	test("should handle boolean values", () => {
		const result = "Active: {active}, Enabled: {enabled}".fmt({
			active: true,
			enabled: false,
		});
		expect(result).toBe("Active: true, Enabled: false");
	});

	test("should handle undefined and null values", () => {
		const result = "Value1: {val1}, Value2: {val2}".fmt({
			val1: undefined,
			val2: null,
		});
		expect(result).toBe("Value1: undefined, Value2: null");
	});

	test("should work with empty string", () => {
		const result = "".fmt({ name: "test" });
		expect(result).toBe("");
	});

	test("should handle mixed positional arguments", () => {
		const result = "{0} + {1} = {2}".fmt(1, 2, 3);
		expect(result).toBe("1 + 2 = 3");
	});
});
