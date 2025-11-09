import { describe, expect, test } from "bun:test";
import { jwt$ } from "@utils";

describe("jwt$ module", () => {
	describe("getSecretKey", () => {
		test("should return Uint8Array from default secret", () => {
			const key = jwt$.getSecretKey();
			expect(key).toBeInstanceOf(Uint8Array);
			expect(key.length).toBeGreaterThan(0);
		});

		test("should return Uint8Array from custom secret", () => {
			const customSecret = "my-custom-secret";
			const key = jwt$.getSecretKey(customSecret);
			expect(key).toBeInstanceOf(Uint8Array);
			expect(key.length).toBe(new TextEncoder().encode(customSecret).length);
		});

		test("should produce same key for same input", () => {
			const secret = "test-secret";
			const key1 = jwt$.getSecretKey(secret);
			const key2 = jwt$.getSecretKey(secret);
			expect(key1).toEqual(key2);
		});

		test("should produce different keys for different inputs", () => {
			const key1 = jwt$.getSecretKey("secret1");
			const key2 = jwt$.getSecretKey("secret2");
			expect(key1).not.toEqual(key2);
		});
	});

	describe("sign", () => {
		test("should create a valid JWT token with default options", async () => {
			const payload = { userId: "123", email: "test@example.com" };
			const token = await jwt$.sign(payload);
			
			expect(token).toBeDefined();
			expect(typeof token).toBe("string");
			expect(token.split(".").length).toBe(3); // JWT has 3 parts: header.payload.signature
		});

		test("should create token with custom expiration time", async () => {
			const payload = { userId: "123" };
			const token = await jwt$.sign(payload, { expiresIn: 7200 });
			
			expect(token).toBeDefined();
			
			// Verify the token contains the right expiration
			const verified = await jwt$.verify(token);
			expect(verified.valid).toBe(true);
		});

		test("should create token with custom issuer and audience", async () => {
			const payload = { userId: "123" };
			const customIssuer = "custom-issuer";
			const customAudience = "custom-audience";
			
			const token = await jwt$.sign(payload, {
				issuer: customIssuer,
				audience: customAudience,
			});
			
			const verified = await jwt$.verify(token, {
				issuer: customIssuer,
				audience: customAudience,
			});
			
			expect(verified.valid).toBe(true);
			expect(verified.payload).toBeDefined();
		});

		test("should create token with subject (sub)", async () => {
			const payload = { sub: "user-123", email: "test@example.com" };
			const token = await jwt$.sign(payload);
			
			const verified = await jwt$.verify(token);
			expect(verified.valid).toBe(true);
			expect(verified.userId).toBe("user-123");
		});

		test("should handle complex payload objects", async () => {
			const payload = {
				userId: "123",
				email: "test@example.com",
				roles: ["admin", "user"],
				metadata: {
					plan: "premium",
					features: ["feature1", "feature2"],
				},
			};
			
			const token = await jwt$.sign(payload);
			const verified = await jwt$.verify(token);
			
			expect(verified.valid).toBe(true);
			expect(verified.payload?.email).toBe("test@example.com");
		});

		test("should create token with custom secret", async () => {
			const customSecret = jwt$.getSecretKey("my-custom-secret");
			const payload = { userId: "123" };
			
			const token = await jwt$.sign(payload, { secret: customSecret });
			const verified = await jwt$.verify(token, { secret: customSecret });
			
			expect(verified.valid).toBe(true);
		});
	});

	describe("verify", () => {
		test("should verify a valid token", async () => {
			const payload = { userId: "123", email: "test@example.com" };
			const token = await jwt$.sign(payload);
			
			const result = await jwt$.verify(token);
			
			expect(result.valid).toBe(true);
			expect(result.payload).toBeDefined();
			expect(result.payload?.email).toBe("test@example.com");
		});

		test("should extract userId from sub claim", async () => {
			const payload = { sub: "user-456", email: "test@example.com" };
			const token = await jwt$.sign(payload);
			
			const result = await jwt$.verify(token);
			
			expect(result.valid).toBe(true);
			expect(result.userId).toBe("user-456");
		});

		test("should extract orgId from org claim", async () => {
			const payload = { sub: "user-456", org: "org-789" };
			const token = await jwt$.sign(payload);
			
			const result = await jwt$.verify(token);
			
			expect(result.valid).toBe(true);
			expect(result.orgId).toBe("org-789");
		});

		test("should reject invalid token format", async () => {
			const result = await jwt$.verify("invalid.token.format");
			
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});

		test("should reject token with tampered signature", async () => {
			const payload = { userId: "123" };
			const token = await jwt$.sign(payload);
			
			// Tamper with the token
			const parts = token.split(".");
			parts[2] = "tamperedSignature";
			const tamperedToken = parts.join(".");
			
			const result = await jwt$.verify(tamperedToken);
			
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});

		test("should reject expired token", async () => {
			const payload = { userId: "123" };
			// Create token that expires in 1 second
			const token = await jwt$.sign(payload, { expiresIn: 1 });
			
			// Wait for token to expire
			await new Promise((resolve) => setTimeout(resolve, 1500));
			
			const result = await jwt$.verify(token);
			
			expect(result.valid).toBe(false);
			expect(result.error).toContain("exp");
		});

		test("should reject token with wrong issuer", async () => {
			const token = await jwt$.sign({ userId: "123" }, { issuer: "issuer1" });
			
			const result = await jwt$.verify(token, { issuer: "issuer2" });
			
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});

		test("should reject token with wrong audience", async () => {
			const token = await jwt$.sign({ userId: "123" }, { audience: "audience1" });
			
			const result = await jwt$.verify(token, { audience: "audience2" });
			
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});

		test("should reject token signed with different secret", async () => {
			const secret1 = jwt$.getSecretKey("secret1");
			const secret2 = jwt$.getSecretKey("secret2");
			
			const token = await jwt$.sign({ userId: "123" }, { secret: secret1 });
			const result = await jwt$.verify(token, { secret: secret2 });
			
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});

		test("should verify token with custom options matching sign options", async () => {
			const customSecret = jwt$.getSecretKey("custom");
			const customIssuer = "my-app";
			const customAudience = "my-users";
			
			const token = await jwt$.sign(
				{ userId: "123" },
				{
					secret: customSecret,
					issuer: customIssuer,
					audience: customAudience,
				}
			);
			
			const result = await jwt$.verify(token, {
				secret: customSecret,
				issuer: customIssuer,
				audience: customAudience,
			});
			
			expect(result.valid).toBe(true);
			expect(result.payload).toBeDefined();
		});

		test("should handle malformed token gracefully", async () => {
			const result = await jwt$.verify("not-a-jwt");
			
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});

		test("should handle empty token", async () => {
			const result = await jwt$.verify("");
			
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("sign and verify integration", () => {
		test("should successfully sign and verify a token", async () => {
			const payload = {
				sub: "user-123",
				email: "user@example.com",
				org: "org-456",
				roles: ["user", "admin"],
			};
			
			const token = await jwt$.sign(payload);
			const result = await jwt$.verify(token);
			
			expect(result.valid).toBe(true);
			expect(result.userId).toBe("user-123");
			expect(result.orgId).toBe("org-456");
			expect(result.payload?.email).toBe("user@example.com");
		});

		test("should maintain payload integrity through sign/verify cycle", async () => {
			const payload = {
				userId: "123",
				metadata: {
					nested: {
						deep: {
							value: "test",
						},
					},
				},
				array: [1, 2, 3],
			};
			
			const token = await jwt$.sign(payload);
			const result = await jwt$.verify(token);
			
			expect(result.valid).toBe(true);
			expect(result.payload?.array).toEqual([1, 2, 3]);
			expect(result.payload?.metadata).toEqual(payload.metadata);
		});

		test("should handle rapid sign/verify operations", async () => {
			const tokens = await Promise.all([
				jwt$.sign({ userId: "1" }),
				jwt$.sign({ userId: "2" }),
				jwt$.sign({ userId: "3" }),
			]);
			
			const results = await Promise.all(tokens.map((t) => jwt$.verify(t)));
			
			expect(results.every((r) => r.valid)).toBe(true);
		});
	});
});
