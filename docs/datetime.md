# DateTime Utilities

Comprehensive date and time handling using dayjs with all plugins pre-configured.

## Import

```typescript
import { date } from '@rniverse/utils';
```

## Plugins Included

All dayjs plugins are pre-configured and ready to use:

- UTC and Timezone support
- Advanced formatting
- Custom parse formats
- Calendar and relative time
- Duration calculations
- Date comparisons (isBetween, isSameOrAfter, etc.)
- Day/week/quarter calculations
- Locale support
- And many more...

---

## Basic Usage

### Current Time

```typescript
const now = date();
```

### Parsing

```typescript
// ISO string
const d = date('2026-02-07');

// Custom format
const d = date('07-02-2026', 'DD-MM-YYYY');

// From object
const d = date({ year: 2026, month: 1, day: 7 });

// From array
const d = date([2026, 1, 7, 10, 30, 0]);

// Unix timestamp (seconds)
const d = date.unix(1738927200);

// JavaScript Date
const d = date(new Date());
```

### Formatting

```typescript
const d = date('2026-02-07 10:30:45');

d.format('YYYY-MM-DD');              // "2026-02-07"
d.format('MMM DD, YYYY');            // "Feb 07, 2026"
d.format('MMMM DD, YYYY HH:mm:ss');  // "February 07, 2026 10:30:45"
d.format('dddd');                    // "Saturday"
d.format('Q');                       // "1" (Quarter)
d.format('BBBB');                    // Buddhist Era year

// Localized format
d.format('L');    // "02/07/2026"
d.format('LL');   // "February 7, 2026"
d.format('LLL');  // "February 7, 2026 10:30 AM"
d.format('LLLL'); // "Saturday, February 7, 2026 10:30 AM"
```

---

## Timezone Support

```typescript
// UTC
const utc = date.utc();
const utcDate = date.utc('2026-02-07 12:00');

// Specific timezone
const nyTime = date.tz('2026-02-07 12:00', 'America/New_York');
const tokyo = date.tz('2026-02-07 12:00', 'Asia/Tokyo');

// Convert timezone
const la = date.tz('2026-02-07 12:00', 'America/New_York');
const laInTokyo = la.tz('Asia/Tokyo');

// Get timezone
la.format('Z');  // "-05:00"
la.format('ZZ'); // "-0500"
```

---

## Date Arithmetic

```typescript
const d = date('2026-02-07');

// Add
d.add(1, 'day');      // Feb 08, 2026
d.add(7, 'days');     // Feb 14, 2026  
d.add(1, 'month');    // Mar 07, 2026
d.add(1, 'year');     // Feb 07, 2027
d.add(2, 'hours');
d.add(30, 'minutes');
d.add(45, 'seconds');

// Subtract
d.subtract(1, 'day');
d.subtract(2, 'weeks');
d.subtract(3, 'months');

// Start/End of period
d.startOf('day');     // 2026-02-07 00:00:00
d.endOf('day');       // 2026-02-07 23:59:59
d.startOf('month');   // 2026-02-01 00:00:00
d.endOf('month');     // 2026-02-28 23:59:59
d.startOf('year');
d.startOf('week');
d.startOf('quarter');
```

---

## Comparison

```typescript
const d1 = date('2026-02-07');
const d2 = date('2026-02-12');

// Basic comparisons
d1.isBefore(d2);     // true
d1.isAfter(d2);      // false
d1.isSame(d1);       // true

// Or/Equal comparisons
d1.isSameOrBefore(d2);  // true
d1.isSameOrAfter(d2);   // false

// Between
d1.isBetween('2026-02-01', '2026-02-20');  // true
d1.isBetween(d1, d2, 'day', '[]');         // inclusive

// Unit-specific comparison
d1.isSame(d2, 'month');  // true (same month)
d1.isSame(d2, 'year');   // true (same year)

// Special comparisons
date().isToday();         // true/false
date().isTomorrow();      // true/false
date().isYesterday();     // true/false
date('2026-01-01').isLeapYear();  // false
```

---

## Relative Time

```typescript
// From now
date().subtract(2, 'hours').fromNow();    // "2 hours ago"
date().add(3, 'days').fromNow();          // "in 3 days"

// To now
date().subtract(1, 'year').toNow();       // "in a year"

// From/To another date
const past = date('2026-02-01');
const now = date('2026-02-07');
past.from(now);   // "6 days ago"
past.to(now);     // "in 6 days"

// Examples
date().subtract(1, 'minute').fromNow();   // "a minute ago"
date().subtract(30, 'minutes').fromNow(); // "30 minutes ago"
date().subtract(2, 'hours').fromNow();    // "2 hours ago"
date().subtract(1, 'day').fromNow();      // "a day ago"
date().subtract(5, 'days').fromNow();     // "5 days ago"
date().subtract(1, 'month').fromNow();    // "a month ago"
date().subtract(2, 'years').fromNow();    // "2 years ago"
```

---

## Calendar

Displays dates relative to now in a human-readable format.

```typescript
date().calendar();                      // "Today at 10:30 AM"
date().add(1, 'day').calendar();        // "Tomorrow at 10:30 AM"
date().subtract(1, 'day').calendar();   // "Yesterday at 10:30 AM"
date().add(3, 'days').calendar();       // "Tuesday at 10:30 AM"
date().subtract(7, 'days').calendar();  // "01/31/2026"

// With reference date
const ref = date('2026-02-07');
date('2026-02-08').calendar(ref);  // "Tomorrow at 12:00 AM"
```

---

## Duration

```typescript
// Create duration
const dur = date.duration(2, 'hours');
const dur2 = date.duration({ hours: 2, minutes: 30 });

// Convert units
dur.asHours();        // 2
dur.asMinutes();      // 120
dur.asSeconds();      // 7200
dur.asMilliseconds(); // 7200000

// Add/subtract
dur.add(30, 'minutes');
dur.subtract(15, 'minutes');

// Humanize
dur.humanize();                    // "2 hours"
dur.humanize(true);                // "in 2 hours"
date.duration(-1, 'days').humanize(true); // "a day ago"

// Duration between dates
const d1 = date('2026-02-07');
const d2 = date('2026-02-12');
const diff = date.duration(d2.diff(d1));
diff.asDays();  // 5
```

---

## Get/Set Values

```typescript
const d = date('2026-02-07 10:30:45');

// Get
d.year();        // 2026
d.month();       // 1 (0-indexed! 0 = January, 1 = February)
d.date();        // 7 (day of month)
d.day();         // 6 (day of week, 0 = Sunday, 6 = Saturday)
d.hour();        // 10
d.minute();      // 30
d.second();      // 45
d.millisecond(); // 0

// Set (returns new dayjs object)
d.year(2027);
d.month(5);      // June (0-indexed)
d.date(20);
d.hour(14);
d.minute(45);

// Multiple sets
d.set('year', 2027);
d.set('month', 11);  // December
```

---

## Week/Quarter Calculations

```typescript
const d = date('2026-02-07');

// Day of year
d.dayOfYear();         // 38
d.dayOfYear(100);      // Set to 100th day

// Week of year
d.week();              // Week number
d.isoWeek();           // ISO week number
d.weekYear();          // Week year
d.isoWeekYear();       // ISO week year
d.isoWeeksInYear();    // Total ISO weeks in year

// Weekday
d.weekday();           // 0-6 (locale aware)
d.isoWeekday();        // 1-7 (Monday = 1, Saturday = 6)

// Quarter
d.quarter();           // 1-4
d.quarter(2);          // Set to Q2
```

---

## Conversion

```typescript
const d = date('2026-02-07 10:30:45');

// To JavaScript Date
d.toDate();           // Date object

// To array
d.toArray();          // [2026, 1, 7, 10, 30, 45, 0]

// To object
d.toObject();
// {
//   years: 2026,
//   months: 1,
//   date: 7,
//   hours: 10,
//   minutes: 30,
//   seconds: 45,
//   milliseconds: 0
// }

// To JSON
d.toJSON();           // "2026-02-07T10:30:45.000Z"

// To ISO string
d.toISOString();      // "2026-02-07T10:30:45.000Z"

// Unix timestamp
d.unix();             // seconds since epoch
d.valueOf();          // milliseconds since epoch
```

---

## Min/Max

```typescript
const dates = [
  date('2026-02-07'),
  date('2026-02-12'),
  date('2026-02-03'),
];

const latest = date.max(...dates);   // Feb 12
const earliest = date.min(...dates); // Feb 03

// Or with array
const latest = date.max(dates);
const earliest = date.min(dates);
```

---

## Validation

```typescript
// Check if valid
date('2026-02-07').isValid();     // true
date('invalid').isValid();        // false

// Check specific formats
date('07-02-2026', 'DD-MM-YYYY', true).isValid();  // true
date('07-02-2026', 'YYYY-MM-DD', true).isValid();  // false
```

---

## Locale

```typescript
// Get locale data
date.months();          // Array of month names
date.monthsShort();     // Array of short month names
date.weekdays();        // Array of weekday names
date.weekdaysShort();   // Array of short weekday names
date.weekdaysMin();     // Array of min weekday names

// Set locale globally
import 'dayjs/locale/es';
date.locale('es');

// Set locale for specific instance
const d = date().locale('es');
d.format('MMMM');  // "febrero"
```

---

## Common Patterns

### Age Calculation

```typescript
const birthdate = date('1990-05-15');
const age = date().diff(birthdate, 'year');
```

### Days Until Event

```typescript
const event = date('2026-12-25');
const daysUntil = event.diff(date(), 'day');
```

### Business Days

```typescript
const start = date('2026-02-07');
let current = start;
let businessDays = 0;

while (businessDays < 5) {
  current = current.add(1, 'day');
  if (current.day() !== 0 && current.day() !== 6) {
    businessDays++;
  }
}
```

### Date Range

```typescript
const start = date('2026-02-01');
const end = date('2026-02-28');
const range = [];

let current = start;
while (current.isSameOrBefore(end)) {
  range.push(current);
  current = current.add(1, 'day');
}
```

### Check if Weekend

```typescript
const isWeekend = (d: any) => d.day() === 0 || d.day() === 6;
isWeekend(date('2026-02-07'));  // true (Saturday)
```

---

## API Reference

For complete API documentation, see [dayjs documentation](https://day.js.org/docs/en/installation/installation).

All plugins are already configured and available.
