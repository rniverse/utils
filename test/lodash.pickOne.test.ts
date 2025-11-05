import { describe, expect, test } from "bun:test";
import { _ } from "../lib/utils/lodash";

describe("lodash.pickOne", () => {
	describe("Basic functionality", () => {
		test("should return value from first key that exists", () => {
			const obj = { name: "Alice", age: 25 };
			const result = _.pickOne(obj, ["name", "age"]);
			expect(result).toBe("Alice");
		});

		test("should return value from second key when first is nil", () => {
			const obj = { name: null as string | null, age: 25 };
			const result = _.pickOne(obj, ["name", "age"]);
			expect(result).toBe(25);
		});

		test("should skip undefined values and use next key", () => {
			const obj = { a: undefined as number | undefined, b: 42 };
			const result = _.pickOne(obj, ["a", "b"]);
			expect(result).toBe(42);
		});

		test("should return first non-nil value", () => {
			const obj = { x: null as number | null, y: undefined as number | undefined, z: 100 };
			const result = _.pickOne(obj, ["x", "y", "z"]);
			expect(result).toBe(100);
		});
	});

	describe("Nested property access", () => {
		test("should access nested properties with dot notation", () => {
			type ObjType = {
				user: { profile: { name: string } };
				fallback?: string;
			};
			const obj: ObjType = {
				user: {
					profile: {
						name: "John",
					},
				},
			};
			const result = _.pickOne(obj, [
				"user.profile.name" as keyof ObjType,
				"fallback" as keyof ObjType,
			]) as string;
			expect(result).toBe("John");
		});

		test("should handle nested path with null intermediate values", () => {
			type ObjType = {
				user: any;
				fallback: string;
			};
			const obj: ObjType = {
				user: null,
				fallback: "default",
			};
			const result = _.pickOne(obj, ["user.name" as keyof ObjType, "fallback"]);
			expect(result).toBe("default");
		});

		test("should handle array access in nested properties", () => {
			type ObjType = {
				users: { name: string }[];
				fallback?: string;
			};
			const obj: ObjType = {
				users: [{ name: "Alice" }, { name: "Bob" }],
			};
			const result = _.pickOne(obj, [
				"users[0].name" as keyof ObjType,
				"fallback" as keyof ObjType,
			]) as string;
			expect(result).toBe("Alice");
		});
	});

	describe("Default value handling", () => {
		test("should return default value when no keys exist", () => {
			type ObjType = { a: number; x?: string; y?: string };
			const obj: ObjType = { a: 1 };
			const result = _.pickOne(obj, ["x", "y"], "default");
			expect(result).toBe("default");
		});

		test("should return default value when all keys are nil", () => {
			const obj = { a: null as string | null, b: undefined as string | undefined };
			const result = _.pickOne(obj, ["a", "b"], "default");
			expect(result).toBe("default");
		});

		test("should return undefined when no default provided and no values found", () => {
			type ObjType = { a: string | null; b?: string };
			const obj: ObjType = { a: null };
			const result = _.pickOne(obj, ["a", "b"]);
			expect(result).toBeUndefined();
		});

		test("should not return default if a valid value exists", () => {
			const obj = { a: null as number | null, b: 50 };
			const result = _.pickOne(obj, ["a", "b"], 0);
			expect(result).toBe(50);
		});
	});

	describe("Edge cases", () => {
		test("should handle empty object", () => {
			const obj = {} as Record<string, string>;
			const result = _.pickOne(obj, [], "fallback");
			expect(result).toBe("fallback");
		});

		test("should handle object with all null values", () => {
			const obj = { a: null as number | null, b: null as number | null, c: null as number | null };
			const result = _.pickOne(obj, ["a", "b", "c"], 999);
			expect(result).toBe(999);
		});

		test("should handle object with all undefined values", () => {
			const obj = {
				a: undefined as number | undefined,
				b: undefined as number | undefined,
			};
			const result = _.pickOne(obj, ["a", "b"]);
			expect(result).toBeUndefined();
		});

		test("should handle empty keys array", () => {
			const obj = { a: 1, b: 2 };
			const result = _.pickOne(obj, [], 999);
			expect(result).toBe(999);
		});

		test("should handle keys that don't exist in object", () => {
			type ObjType = { a: number; x?: string; y?: string; z?: string };
			const obj: ObjType = { a: 1 };
			const result = _.pickOne(obj, ["x", "y", "z"]);
			expect(result).toBeUndefined();
		});

		test("should handle non-existent nested paths", () => {
			type ObjType = { user?: { name?: string }; fallback: string };
			const obj: ObjType = { fallback: "default" };
			const result = _.pickOne(obj, ["user.name" as keyof ObjType, "fallback"]);
			expect(result).toBe("default");
		});
	});

	describe("Complex scenarios", () => {
		test("should handle mixed primitive types", () => {
			const obj = {
				str: null as string | null,
				num: 0,
				bool: false,
			};
			const result = _.pickOne(obj, ["str", "num", "bool"]);
			expect(result).toBe(0);
		});

		test("should handle deeply nested object paths", () => {
			type ObjType = {
				level1?: { level2?: { level3?: { value?: number } } };
				fallback: number;
			};
			const obj: ObjType = {
				level1: {
					level2: {
						level3: {
							value: 42,
						},
					},
				},
				fallback: 0,
			};
			const result = _.pickOne(obj, [
				"level1.level2.level3.value" as keyof ObjType,
				"fallback",
			]) as number;
			expect(result).toBe(42);
		});

		test("should correctly skip multiple nil values before finding value", () => {
			const obj = {
				a: null as string | null,
				b: undefined as string | undefined,
				c: null as string | null,
				d: "found",
			};
			const result = _.pickOne(obj, ["a", "b", "c", "d"]);
			expect(result).toBe("found");
		});

		test("should treat 0 as valid value", () => {
			const obj = { a: 0, b: 100 };
			const result = _.pickOne(obj, ["a", "b"]);
			expect(result).toBe(0);
		});

		test("should treat false as valid value", () => {
			const obj = { a: false, b: true };
			const result = _.pickOne(obj, ["a", "b"]);
			expect(result).toBe(false);
		});

		test("should treat empty string as valid value", () => {
			const obj = { a: "", b: "not empty" };
			const result = _.pickOne(obj, ["a", "b"]);
			expect(result).toBe("");
		});

    test.only("second param can be a single key", () => {
			const obj = { a: "", b: "not empty" };
			const result = _.pickOne(obj, "b.length");
			expect(result).toBe(9);
		});
	});
});
