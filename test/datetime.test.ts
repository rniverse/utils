import { describe, expect, test } from "bun:test";
import { date } from "@utils";

describe("Datetime (dayjs with all plugins)", () => {
	test("should be defined and callable", () => {
		expect(date).toBeDefined();
		expect(typeof date).toBe("function");
		const d = date();
		expect(d.isValid()).toBe(true);
	});

	test("should parse and format dates", () => {
		const d = date("2024-01-15");
		expect(d.format("YYYY-MM-DD")).toBe("2024-01-15");
	});

	test("should support UTC plugin", () => {
		const d = date.utc("2024-01-15");
		expect(d.isValid()).toBe(true);
		expect(d.utc().isValid()).toBe(true);
	});

	test("should support timezone plugin", () => {
		const d = date.tz("2024-01-15", "America/New_York");
		expect(d.isValid()).toBe(true);
	});

	test("should support advancedFormat plugin (Quarter)", () => {
		const d = date("2024-01-15");
		const formatted = d.format("Q");
		expect(formatted).toBe("1");
	});

	test("should support relativeTime plugin", () => {
		const d = date().subtract(1, "hour");
		const relative = d.fromNow();
		expect(relative).toContain("hour");
	});

	test("should support duration plugin", () => {
		const duration = date.duration(1, "hour");
		expect(duration.asMinutes()).toBe(60);
	});

	test("should support isSameOrBefore plugin", () => {
		const d1 = date("2024-01-15");
		const d2 = date("2024-01-16");
		expect(d1.isSameOrBefore(d2)).toBe(true);
		expect(d2.isSameOrBefore(d1)).toBe(false);
	});

	test("should support isSameOrAfter plugin", () => {
		const d1 = date("2024-01-15");
		const d2 = date("2024-01-16");
		expect(d2.isSameOrAfter(d1)).toBe(true);
		expect(d1.isSameOrAfter(d2)).toBe(false);
	});

	test("should support isBetween plugin", () => {
		const d = date("2024-01-15");
		const start = date("2024-01-10");
		const end = date("2024-01-20");
		expect(d.isBetween(start, end)).toBe(true);
	});

	test("should support isToday plugin", () => {
		const today = date();
		expect(today.isToday()).toBe(true);
		const yesterday = date().subtract(1, "day");
		expect(yesterday.isToday()).toBe(false);
	});

	test("should support isTomorrow plugin", () => {
		const tomorrow = date().add(1, "day");
		expect(tomorrow.isTomorrow()).toBe(true);
		const today = date();
		expect(today.isTomorrow()).toBe(false);
	});

	test("should support isYesterday plugin", () => {
		const yesterday = date().subtract(1, "day");
		expect(yesterday.isYesterday()).toBe(true);
		const today = date();
		expect(today.isYesterday()).toBe(false);
	});

	test("should support isLeapYear plugin", () => {
		const leapYear = date("2024-01-01");
		const nonLeapYear = date("2023-01-01");
		expect(leapYear.isLeapYear()).toBe(true);
		expect(nonLeapYear.isLeapYear()).toBe(false);
	});

	test("should support dayOfYear plugin", () => {
		const d = date("2024-01-15");
		expect(d.dayOfYear()).toBe(15);
	});

	test("should support weekOfYear plugin", () => {
		const d = date("2024-01-15");
		const week = d.week();
		expect(week).toBeGreaterThan(0);
		expect(week).toBeLessThanOrEqual(53);
	});

	test("should support weekday plugin", () => {
		const d = date("2024-01-15");
		expect(d.weekday()).toBeGreaterThanOrEqual(0);
		expect(d.weekday()).toBeLessThan(7);
	});

	test("should support isoWeek plugin", () => {
		const d = date("2024-01-15");
		const isoWeek = d.isoWeek();
		expect(isoWeek).toBeGreaterThan(0);
		expect(isoWeek).toBeLessThanOrEqual(53);
	});

	test("should support quarterOfYear plugin", () => {
		const q1 = date("2024-01-15");
		const q2 = date("2024-04-15");
		const q3 = date("2024-07-15");
		const q4 = date("2024-10-15");

		expect(q1.quarter()).toBe(1);
		expect(q2.quarter()).toBe(2);
		expect(q3.quarter()).toBe(3);
		expect(q4.quarter()).toBe(4);
	});

	test("should support toArray plugin", () => {
		const d = date("2024-01-15 10:30:45");
		const arr = d.toArray();
		expect(Array.isArray(arr)).toBe(true);
		expect(arr[0]).toBe(2024);
		expect(arr[1]).toBe(0); // month is 0-indexed
		expect(arr[2]).toBe(15);
	});

	test("should support toObject plugin", () => {
		const d = date("2024-01-15");
		const obj = d.toObject();
		expect(obj).toHaveProperty("years");
		expect(obj).toHaveProperty("months");
		expect(obj).toHaveProperty("date");
		expect(obj.years).toBe(2024);
		expect(obj.months).toBe(0); // 0-indexed
		expect(obj.date).toBe(15);
	});

	test("should support minMax plugin", () => {
		const d1 = date("2024-01-15");
		const d2 = date("2024-01-20");
		const d3 = date("2024-01-10");

		const max = date.max(d1, d2, d3);
		const min = date.min(d1, d2, d3);

		expect(max?.format("YYYY-MM-DD")).toBe("2024-01-20");
		expect(min?.format("YYYY-MM-DD")).toBe("2024-01-10");
	});

	test("should support objectSupport plugin", () => {
		const d = date({ year: 2024, month: 0, day: 15 });
		expect(d.format("YYYY-MM-DD")).toBe("2024-01-15");
	});

	test("should support localeData plugin", () => {
		const months = date.months();
		expect(Array.isArray(months)).toBe(true);
		expect(months.length).toBe(12);
		expect(months[0]).toBe("January");
	});

	test("should support localizedFormat plugin", () => {
		const d = date("2024-01-15");
		const formatted = d.format("L");
		expect(formatted).toMatch(/\d+/);
	});

	test("should support calendar plugin", () => {
		const tomorrow = date().add(1, "day");
		const calendar = tomorrow.calendar();
		expect(calendar).toContain("Tomorrow");
	});

	test("should support customParseFormat plugin", () => {
		const d = date("15-01-2024", "DD-MM-YYYY");
		expect(d.format("YYYY-MM-DD")).toBe("2024-01-15");
	});

	test("should handle date arithmetic", () => {
		const d = date("2024-01-15");
		const future = d.add(7, "day");
		const past = d.subtract(7, "day");

		expect(future.format("YYYY-MM-DD")).toBe("2024-01-22");
		expect(past.format("YYYY-MM-DD")).toBe("2024-01-08");
	});

	test("should handle date comparison", () => {
		const d1 = date("2024-01-15");
		const d2 = date("2024-01-20");

		expect(d1.isBefore(d2)).toBe(true);
		expect(d2.isAfter(d1)).toBe(true);
		expect(d1.isSame(d1)).toBe(true);
	});

	test("should handle invalid dates", () => {
		const invalid = date("invalid");
		expect(invalid.isValid()).toBe(false);
	});

	test("should get and set values", () => {
		const d = date("2024-01-15");
		expect(d.year()).toBe(2024);
		expect(d.month()).toBe(0);
		expect(d.date()).toBe(15);

		const modified = d.year(2025);
		expect(modified.year()).toBe(2025);
	});

	test("should convert to JavaScript Date", () => {
		const d = date("2024-01-15");
		const jsDate = d.toDate();
		expect(jsDate instanceof Date).toBe(true);
		expect(jsDate.getFullYear()).toBe(2024);
	});

	test("should get unix timestamps", () => {
		const d = date("2024-01-15T00:00:00Z");
		const unix = d.unix();
		expect(typeof unix).toBe("number");
		expect(unix).toBeGreaterThan(0);
	});

	test("should handle timezone conversions", () => {
		const utcDate = date.utc("2024-01-15 12:00");
		const nyDate = utcDate.tz("America/New_York");
		expect(nyDate.isValid()).toBe(true);
	});

	test("should support week year calculations", () => {
		const d = date("2024-01-01");
		const weekYear = d.weekYear();
		expect(typeof weekYear).toBe("number");
		expect(weekYear).toBeGreaterThan(2000);
	});

	test("should support ISO week calculations", () => {
		const d = date("2024-01-15");
		const isoWeekYear = d.isoWeekYear();
		expect(isoWeekYear).toBe(2024);
	});

	test("should handle Buddhist Era calendar", () => {
		const d = date("2024-01-15");
		const buddhistYear = d.format("BBBB");
		expect(typeof buddhistYear).toBe("string");
		expect(buddhistYear.length).toBeGreaterThan(0);
	});
});
