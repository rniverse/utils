# @rniverse/utils

High-performance, zero-dependency utilities for the RNiverse monorepo.

This package provides a unified toolset for logging, distributed request tracing, ID generation, deep object manipulation, and date formatting using `pino`, `dayjs`, `es-toolkit` (lodash drop-in), and `ulid`.

## Installation

```bash
bun add @rniverse/utils
```

### Peer Dependencies
```jsonc
{
  "bullmq": "^5.63.0",
  "pino": "^10.1.0",
  "pino-pretty": "^13.1.2",
  "typescript": "^5"
}
```

---

## Logging & Context Isolation

The logger is built on `pino` and integrated with Node's `AsyncLocalStorage` (`node:async_hooks`). It automatically attaches `req_id` and `user_id` to all logs triggered within a request's lifecycle, without needing to pass a logger instance through your functions.

### `cxt$req` (Request Context)

```typescript
import { cxt$req, log } from '@rniverse/utils';
import { Elysia } from 'elysia';

const app = new Elysia()
  .use((app) =>
    app.derive(async ({ request }) => {
      // Create a unique context boundary per request
      const contextStore = cxt$req.withRequestId({ 
        // Generates a UUIDv7 requestId automatically if not provided
        userId: 'optional-user-id' 
      });

      // All logs inside this scope automatically inherit the requestId
      return contextStore(() => {
        log.info('Handling incoming request');
        // Output: [req_id:01J... userId:optional-user-id] Handling incoming request
      });
    })
  );
```

You can update the context cleanly mid-flight:
```typescript
cxt$req.setUserId('user-456');
cxt$req.setRequestContext('tenantId', 'acme-inc');

const currentReqId = cxt$req.getRequestId();
```


```
non Elysia request should use runWithContext

import { sleep } from 'bun';
import { cxt$req, log, runWithContext } from './utils';

if (require.main === module) {
	console.log(
		'BEFORE: This is a utility library. Please import the functions you need.',
	);
	log.info(
		'BEFORE: This is a utility library. Please import the functions you need.',
	);
	const w1 = async () => {
		await sleep(100);
		log.info('Inside w1');
		cxt$req.setUserId('w1-user');
		log.info('Inside w1 after setting user ID');
	};

	const w2 = async () => {
		await sleep(500);
		cxt$req.setUserId('w2-user');
		log.info('Inside w2');
		log.info('Inside w2 after setting user ID');
	};
	await Promise.all([runWithContext(w1), runWithContext(w2)]);
}

```

---

## ID Generation

High-performance ID generators using time-ordered, sortable specs.

### `uuid` (UUID v7)

Strict RFC-compliant UUID v7. Lexicographically sortable.

```typescript
import { uuid } from '@rniverse/utils';

const id = uuid.generate(); 
// '018b329c-efb5-7c15-a682-16adacc65b4c'

const timestamp = uuid.extractTime(id); 
// 1695240316853 (ms since epoch)
```

### `ulid` (Universally Unique Lexicographically Sortable ID)

Strict time-ordered 26-character Base32 strings.

```typescript
import { ulid } from '@rniverse/utils';

const id = ulid.generate();
// '01ARZ3NDEKTSV4RRFFQ69G5FAV'

const time = ulid.extractTime(id);
// 1469918176385
```

---

## Data Manipulation (`_`)

Drop-in replacement for Lodash using `es-toolkit` under the hood for massive performance gains, extended with custom RNiverse methods.

```typescript
import { _ } from '@rniverse/utils';
```

### `_.cleanup(obj, [clearFn])`

Recursively removes `null` and `undefined` properties from deeply nested objects without mutating the original object. Safe for primitives and arrays. By default, it preserves falsy values like `0`, `false`, and `""`.

```typescript
const dirty = { a: 1, b: null, c: { d: undefined, e: 2 }, f: [null, 3] };
const clean = _.cleanup(dirty); 
// { a: 1, c: { e: 2 }, f: [null, 3] }
```

### `_.pickOne(obj, keys, default)`

Safely attempts to grab the first non-nil value from a list of possible paths.

```typescript
const data = { auth: { user: 'Alice' }, legacyId: '123' };

const id = _.pickOne(data, ['auth.id', 'legacyId'], 'anonymous'); 
// returns '123'
```

### `_.templated(template, input)`

Transforms an input object safely into a structured output based on a map of getter paths, defaults, and hardcoded values.

```typescript
const user = { details: { firstName: 'John' } };
const config = {
  name: { getters: ['details.firstName', 'legacyName'], default: 'Unknown' },
  role: { hardcode: 'user' },
  createdAt: { now: true }
};

const result = _.templated(config, user);
// { name: 'John', role: 'user', createdAt: '2023-11-20T12:00:00.000Z' }
```

---

## String Patch (`fmt`)

Monkey-patches `String.prototype.fmt` to support Python-style string interpolation handling positional, mapped, and deeply nested object properties. Safe to use with nil values.

```typescript
import '@rniverse/utils'; // automatically patches String

// Object mapped
"Hello {user}".fmt({ user: "Alice" }); // "Hello Alice"

// Deep object fields
"Welcome, {profile.name}!".fmt({ profile: { name: "Bob" } }); // "Welcome, Bob!"

// Positional arguments
"Count: {0}, {1}, {2}".fmt(1, 2, 3); // "Count: 1, 2, 3"

// Case-insensitive fallback
"Status: {STATUS}".fmt({ status: "active" }); // "Status: active"
```

---

## Date Formatting (`date`)

Exports an extended instance of `dayjs` pre-loaded with essential plugins: Use this instead of importing `dayjs` directly to ensure plugin consistency.

**Included capabilities:**
- UTC & Timezone (`dayjs.utc().tz('America/New_York')`)
- Advanced & Localized formatting
- Relative Time (`fromNow()`)
- Min/Max, Object Support, and durations.

```typescript
import { date } from '@rniverse/utils';

const now = date().tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss');
const isPast = date('2022-01-01').isBefore(date());
```
