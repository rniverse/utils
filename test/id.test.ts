import { describe, expect, test } from 'bun:test';
import { sleep } from '../lib';
import { ulid, uuid } from '../lib/utils/id';

describe('ID utilities', () => {
	describe('UUID v7', () => {
		test('should generate a valid UUID v7', () => {
			const id = uuid.generate();
			expect(id).toBeDefined();
			expect(typeof id).toBe('string');

			// UUID v7 format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
			const uuidPattern =
				/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
			expect(uuidPattern.test(id)).toBe(true);
		});

		test('should generate unique UUIDs', () => {
			const id1 = uuid.generate();
			const id2 = uuid.generate();
			const id3 = uuid.generate();

			expect(id1).not.toBe(id2);
			expect(id2).not.toBe(id3);
			expect(id1).not.toBe(id3);
		});

		test('should generate multiple unique UUIDs in loop', () => {
			const ids = new Set<string>();
			const count = 100;

			for (let i = 0; i < count; i++) {
				ids.add(uuid.generate());
			}

			expect(ids.size).toBe(count);
		});

		test('should extract timestamp from UUID v7', () => {
			const id = uuid.generate();
			const timestamp = uuid.extractTime(id);

			expect(typeof timestamp).toBe('number');
			expect(timestamp).toBeGreaterThan(0);

			// Timestamp should be close to current time (within a few seconds)
			const now = Date.now();
			const diff = Math.abs(now - timestamp);
			expect(diff).toBeLessThan(5000); // within 5 seconds
		});

		test('should extract increasing timestamps', () => {
			const id1 = uuid.generate();
			const timestamp1 = uuid.extractTime(id1);

			// Wait a tiny bit to ensure different timestamps
			const id2 = uuid.generate();
			const timestamp2 = uuid.extractTime(id2);

			expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
		});

		test('should extract valid timestamp from known UUID v7', () => {
			// Create a UUID v7 with known timestamp
			// UUID v7 format has timestamp in first 48 bits
			const timestamp = Date.now();
			const id = uuid.generate();
			const extracted = uuid.extractTime(id);

			// Should be very close to current time
			expect(Math.abs(extracted - timestamp)).toBeLessThan(100);
		});

		test('UUIDs should be sortable by time', () => {
			const ids: string[] = [];
			const timestamps: number[] = [];

			// Generate IDs with small delays
			for (let i = 0; i < 5; i++) {
				const id = uuid.generate();
				ids.push(id);
				timestamps.push(uuid.extractTime(id));
			}

			// Check timestamps are in order
			for (let i = 1; i < timestamps.length; i++) {
				const current = timestamps[i];
				const previous = timestamps[i - 1];
				if (current !== undefined && previous !== undefined) {
					expect(current).toBeGreaterThanOrEqual(previous);
				}
			}
		});
	});

	describe('ULID', () => {
		test('should generate a valid ULID', () => {
			const id = ulid.generate();
			expect(id).toBeDefined();
			expect(typeof id).toBe('string');
			expect(id.length).toBe(26);

			// ULID should only contain Crockford's Base32 alphabet
			const ulidPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/;
			expect(ulidPattern.test(id)).toBe(true);
		});

		test('should generate unique ULIDs', () => {
			const id1 = ulid.generate();
			const id2 = ulid.generate();
			const id3 = ulid.generate();

			expect(id1).not.toBe(id2);
			expect(id2).not.toBe(id3);
			expect(id1).not.toBe(id3);
		});

		test('should generate multiple unique ULIDs in loop', () => {
			const ids = new Set<string>();
			const count = 100;

			for (let i = 0; i < count; i++) {
				ids.add(ulid.generate());
			}

			expect(ids.size).toBe(count);
		});

		test('should extract timestamp from ULID', () => {
			const id = ulid.generate();
			const timestamp = ulid.extractTime(id);

			expect(typeof timestamp).toBe('number');
			expect(timestamp).toBeGreaterThan(0);

			// Timestamp should be close to current time (within a few seconds)
			const now = Date.now();
			const diff = Math.abs(now - timestamp);
			expect(diff).toBeLessThan(5000); // within 5 seconds
		});

		test('should extract increasing timestamps', () => {
			const id1 = ulid.generate();
			const timestamp1 = ulid.extractTime(id1);

			const id2 = ulid.generate();
			const timestamp2 = ulid.extractTime(id2);

			expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
		});

		test('ULIDs should be lexicographically sortable', async () => {
			const ids: string[] = [];

			// Generate IDs with small delays to ensure different timestamps
			for (let i = 0; i < 5; i++) {
				ids.push(ulid.generate());
				// Small delay to ensure monotonic ordering
				await sleep(5);
			}

			// Copy and sort to compare
			const sorted = [...ids].sort();

			// Original should match sorted (all in order)
			for (let i = 0; i < ids.length; i++) {
				expect(ids[i]).toBe(sorted[i]);
			}
		});

		test('should create monotonic ULID factory', () => {
			const factory = ulid.ulidFactory();
			const id1 = factory();
			const id2 = factory();

			expect(id1).toBeDefined();
			expect(id2).toBeDefined();
			expect(id1).not.toBe(id2);

			// Monotonic factory ensures IDs are always increasing
			expect(id2 > id1).toBe(true);
		});

		test('monotonic factory should maintain order', () => {
			const factory = ulid.ulidFactory();
			const ids: string[] = [];

			for (let i = 0; i < 10; i++) {
				ids.push(factory());
			}

			// All IDs should be in strict ascending order
			for (let i = 1; i < ids.length; i++) {
				const current = ids[i];
				const previous = ids[i - 1];
				if (current !== undefined && previous !== undefined) {
					expect(current > previous).toBe(true);
				}
			}
		});

		test('monotonic factory should handle rapid generation', () => {
			const factory = ulid.ulidFactory();
			const ids = new Set<string>();

			// Generate many IDs rapidly
			for (let i = 0; i < 1000; i++) {
				ids.add(factory());
			}

			// All should be unique
			expect(ids.size).toBe(1000);
		});

		test('ULID should be case-insensitive safe', () => {
			const id = ulid.generate();
			// ULID uses uppercase letters only
			expect(id).toBe(id.toUpperCase());
		});
	});

	describe('UUID vs ULID comparison', () => {
		test('both should generate valid IDs', () => {
			const uuidId = uuid.generate();
			const ulidId = ulid.generate();

			expect(uuidId).toBeDefined();
			expect(ulidId).toBeDefined();
			expect(uuidId.length).toBeGreaterThan(0);
			expect(ulidId.length).toBe(26);
		});

		test('both should support timestamp extraction', () => {
			const uuidId = uuid.generate();
			const ulidId = ulid.generate();

			const uuidTime = uuid.extractTime(uuidId);
			const ulidTime = ulid.extractTime(ulidId);

			expect(uuidTime).toBeGreaterThan(0);
			expect(ulidTime).toBeGreaterThan(0);

			// Both should be close to current time
			const now = Date.now();
			expect(Math.abs(now - uuidTime)).toBeLessThan(5000);
			expect(Math.abs(now - ulidTime)).toBeLessThan(5000);
		});

		test('both should be unique within batch', () => {
			const uuids = new Set<string>();
			const ulids = new Set<string>();

			for (let i = 0; i < 50; i++) {
				uuids.add(uuid.generate());
				ulids.add(ulid.generate());
			}

			expect(uuids.size).toBe(50);
			expect(ulids.size).toBe(50);
		});
	});

	describe('Edge cases and performance', () => {
		test('UUID should handle rapid generation', () => {
			const ids = new Set<string>();
			const count = 10000;

			for (let i = 0; i < count; i++) {
				ids.add(uuid.generate());
			}

			expect(ids.size).toBe(count);
		});

		test('ULID should handle rapid generation', () => {
			const ids = new Set<string>();
			const count = 10000;

			for (let i = 0; i < count; i++) {
				ids.add(ulid.generate());
			}

			expect(ids.size).toBe(count);
		});

		test('UUID timestamp extraction should be consistent', () => {
			const id = uuid.generate();
			const time1 = uuid.extractTime(id);
			const time2 = uuid.extractTime(id);

			expect(time1).toBe(time2);
		});

		test('ULID timestamp extraction should be consistent', () => {
			const id = ulid.generate();
			const time1 = ulid.extractTime(id);
			const time2 = ulid.extractTime(id);

			expect(time1).toBe(time2);
		});

		test('UUID should be formatted correctly', () => {
			const id = uuid.generate();
			const parts = id.split('-');

			expect(parts.length).toBe(5);
			expect(parts[0]?.length).toBe(8);
			expect(parts[1]?.length).toBe(4);
			expect(parts[2]?.length).toBe(4);
			expect(parts[3]?.length).toBe(4);
			expect(parts[4]?.length).toBe(12);
		});

		test('ULID length should be consistent', () => {
			for (let i = 0; i < 100; i++) {
				const id = ulid.generate();
				expect(id.length).toBe(26);
			}
		});
	});

	describe('Time ordering', () => {
		test('UUIDs generated later should have later timestamps', async () => {
			const id1 = uuid.generate();
			const time1 = uuid.extractTime(id1);

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 10));

			const id2 = uuid.generate();
			const time2 = uuid.extractTime(id2);

			expect(time2).toBeGreaterThan(time1);
		});

		test('ULIDs generated later should have later timestamps', async () => {
			const id1 = ulid.generate();
			const time1 = ulid.extractTime(id1);

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 10));

			const id2 = ulid.generate();
			const time2 = ulid.extractTime(id2);

			expect(time2).toBeGreaterThan(time1);
		});

		test('ULIDs should be sortable as strings', async () => {
			const id1 = ulid.generate();
			await new Promise((resolve) => setTimeout(resolve, 5));
			const id2 = ulid.generate();
			await new Promise((resolve) => setTimeout(resolve, 5));
			const id3 = ulid.generate();

			const sorted = [id3, id1, id2].sort();
			expect(sorted[0]).toBe(id1);
			expect(sorted[2]).toBe(id3);
		});
	});
});
