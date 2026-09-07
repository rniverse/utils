# @rniverse/utils

A comprehensive utility library for TypeScript/Bun applications, providing common functionality for logging, datetime handling, ID generation, an HTTP client, and more.

## Table of Contents

- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Core Utilities](#core-utilities)
  - [Lodash Extensions](#lodash-extensions)
  - [ID Generation](#id-generation)
  - [DateTime](#datetime)
  - [JWT](#jwt)
  - [Logger](#logger)
  - [Request Context](#request-context)
  - [String Extensions](#string-extensions)
- [Additional Utilities](#additional-utilities)
- [Type Definitions](#type-definitions)

## Installation

```bash
bun install github:rniverse/utils#dist
```

## Environment Variables

The following environment variables can be configured:

| Variable | Description | Default |
|----------|-------------|----------|
| `NODE_ENV` | `production` → newline-JSON logs instead of pretty | — |
| `LOG_LEVEL` | `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` \| `silent` | `'info'` |
| `LOG_PRETTY` | `true` forces pretty logs even without a TTY | — |
| `INSTANCE_NAME` | App/instance name for `environment` consumers (e.g. connectors) | — |

## Quick Start

```typescript
import { log, uuid, ulid, date, _, cxt$req, runWithContext } from '@rniverse/utils';
import '@rniverse/utils/patch'; // opt-in: String.prototype.fmt

// Generate IDs
const id = uuid.generate();
const ulidId = ulid.generate();

// Format dates
const now = date().format('YYYY-MM-DD HH:mm:ss');

// Use lodash with custom extensions
const cleaned = _.cleanup({ a: 1, b: null, c: undefined }); // { a: 1 }

// Logging with request context
runWithContext(() => {
  log.info('Request started');
});
```

---

## Core Utilities

### Lodash Extensions

Extended lodash with custom utility functions. See [Lodash Extensions Documentation](./lodash.md) for detailed information.

#### Import

```typescript
import { _ } from '@rniverse/utils';
```

#### Available Extensions

- **`cleanup(obj, clearFn?)`** - Remove nil values from objects/arrays
- **`pickOne(obj, keys, default?)`** - Get first non-nil value from multiple keys
- **`templated(template, input)`** - Transform data using template configuration
- **`titleCase(str)`** - Convert strings to title case

All standard lodash functions are also available.

[→ Full Lodash Documentation](./lodash.md)

---

### ID Generation

Generate unique identifiers with timestamp support.

#### Import

```typescript
import { uuid, ulid } from '@rniverse/utils';
```

#### UUID v7

RFC-compliant UUID v7 with millisecond precision timestamps.

```typescript
// Generate UUID v7
const id = uuid.generate();
// Example: "018d3f75-a5e3-7c4a-9f2b-1234567890ab"

// Extract timestamp
const timestamp = uuid.extractTime(id);
// Returns: milliseconds since epoch
```

**Features:**
- Time-ordered (sortable)
- Millisecond precision
- Globally unique
- **Format:** `xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx`

#### ULID

Universally Unique Lexicographically Sortable Identifier.

```typescript
// Generate ULID
const id = ulid.generate();
// Example: "01HG8Z7X8QK5WQVZ7XQYJ9M7N8"

// Extract timestamp
const timestamp = ulid.extractTime(id);

// Monotonic factory (guaranteed ordering)
const factory = ulid.ulidFactory();
const id1 = factory(); // Always < id2
const id2 = factory();
```

**Features:**
- Lexicographically sortable
- 26 characters (vs 36 for UUID)
- Case-insensitive
- Crockford's Base32 alphabet
- Monotonic factory available

**When to use what:**
- **UUID v7**: Need RFC compliance, interoperability with other systems
- **ULID**: Need shorter IDs, string sorting, high-performance generation

---

### DateTime

Extended dayjs with all plugins pre-configured. See [DateTime Documentation](./datetime.md) for comprehensive guide.

#### Import

```typescript
import { date } from '@rniverse/utils';
```

#### Quick Examples

```typescript
// Current time
const now = date();

// Parse and format
const d = date('2024-01-15');
d.format('YYYY-MM-DD'); // "2024-01-15"
d.format('MMM DD, YYYY'); // "Jan 15, 2024"

// Timezone support
const nyTime = date.tz('2024-01-15 10:00', 'America/New_York');

// Relative time
date().subtract(2, 'hours').fromNow(); // "2 hours ago"

// Comparisons
date('2024-01-15').isBefore('2024-01-20'); // true
date().isToday(); // true

// Duration
const duration = date.duration(2, 'hours');
duration.asMinutes(); // 120

// Calendar
date().add(1, 'day').calendar(); // "Tomorrow at 10:30 AM"
```

[→ Full DateTime Documentation](./datetime.md)

---

### JWT

Only the `jose` library itself is re-exported — no wrapper helpers, no shared
secret. Bring your own algorithm and keys.

```typescript
import { jose } from '@rniverse/utils';

// RS256 + JWKS (what `aham` does)
const privateKey = await jose.importPKCS8(pem, 'RS256');
const token = await new jose.SignJWT({ sub: userId })
  .setProtectedHeader({ alg: 'RS256', kid })
  .setIssuedAt()
  .setExpirationTime('15m')
  .sign(privateKey);

const publicKey = await jose.importSPKI(pem, 'RS256');
const { payload } = await jose.jwtVerify(token, publicKey, { algorithms: ['RS256'] });
```

---

### Logger

Pino-based logger with request-context integration.

- **Pretty + synchronous** output only for local dev / tests — when
  `NODE_ENV=test`, `LOG_PRETTY=true`, or stdout is a TTY.
- **Newline-delimited JSON** everywhere else (production).
- **Redaction** — `password`, `hash`, `token`, `secret`, `authorization`,
  `*.accessToken`, `*.refreshToken`, `headers.cookie` (one level deep) are
  replaced with `***`, so logging a whole request / user / config object is safe.
- `reqId` / `userId` are pulled from the current request context on every line.
- Extra `log` level at 25 (`log.log(...)`), between `debug` and `info`.

#### Import

```typescript
import { log } from '@rniverse/utils';
// or the subpath: import { log } from '@rniverse/utils/logger';
```

#### Configuration

Configure via environment variable (see [Environment Variables](#environment-variables) section):

```bash
LOG_LEVEL=info  # trace | debug | info | warn | error | fatal
```

#### Basic Usage

```typescript
// Log levels
log.info('Information message');
log.warn('Warning message');
log.error('Error message');
log.debug('Debug message');
log.trace('Trace message');
log.fatal('Fatal message');

// Structured logging
log.info({ userId: 123, action: 'login' }, 'User logged in');

// Error logging
try {
  throw new Error('Something went wrong');
} catch (error) {
  log.error(error, 'Operation failed');
}
```

#### With Request Context

The logger automatically includes `req_id` and `user_id` from request context:

```typescript
import { log, cxt$req } from '@rniverse/utils';

// Start request with context
runWithContext(() => {
  log.info('Request started');
  // Output: reqId:018d... - userId:user-123 - Request started

  performOperation();

  log.info('Request completed');
  // Same reqId throughout
}, { userId: 'user-123' });

function performOperation() {
  // Logger automatically includes context
  log.info('Performing operation');
}
```

#### Child Loggers

```typescript
const childLogger = log.child({ module: 'auth' });
childLogger.info('Authentication successful');
```

#### Output Format

Pretty-printed format:
```
yyyy-mm-dd HH:MM:ss [req_id:...] [user_id:...] message
```

---

### Request Context

Request- / job-scoped ambient state, built on `AsyncLocalStorage.run()`. A store
only exists inside `run()` / `bindFetch()` / `runWithContext()`. `enterWith` is
not used — mutation edits the current store in place.

#### Import

```typescript
import { cxt$req, runWithContext } from '@rniverse/utils';
// or the subpath: import { cxt$req } from '@rniverse/utils/context';
```

#### Scripts, workers, jobs

```typescript
runWithContext(() => {
  const requestId = cxt$req.requestId(); // generated UUID v7
  log.info('processing');                // log lines carry reqId / userId
}, { userId: 'user-123', tenant: 'acme' });
```

#### HTTP servers

Wrap the fetch handler once — every request then runs in its own store:

```typescript
Bun.serve({
  port,
  fetch: cxt$req.bindFetch((req) => app.handle(req)),
});

// anywhere downstream (middleware, handlers, services, onError):
cxt$req.set('userId', user.id);   // in-place, no new store
cxt$req.patch({ tenant });
```

`bindFetch(handler, seed?)` — `seed(...args)` may derive initial store fields
from the handler's arguments (e.g. an inbound `x-request-id`).

#### Read / write

```typescript
cxt$req.store()          // the whole store, or undefined outside a context
cxt$req.requestId()      // string | undefined
cxt$req.userId()         // string | undefined
cxt$req.get('tenant')    // any keyed value
cxt$req.set('userId', 'user-456')       // mutate one field in place
cxt$req.patch({ sessionId: 'session-789' })
```

#### Context type

```typescript
type TRequestContext = {
  requestId: string;
  userId?: string;
  [key: string]: unknown;
};
```

#### Isolation

Each `run()` / `bindFetch()` call is fully isolated — concurrent requests never
see each other's `requestId` / `userId`, and the store survives every `await`
inside the callback.

```typescript
await Promise.all(
  ['user1', 'user2', 'user3'].map((userId) =>
    cxt$req.run({ requestId: crypto.randomUUID(), userId }, async () => {
      log.info('processing user');
      await processUser(userId);
      log.info('user processed'); // same reqId as the line above
    }),
  ),
);
```

---

### String Extensions

Custom string prototype extensions for formatting.

#### Import

```typescript
import '@rniverse/utils/patch';
```

#### String.prototype.fmt

Template string formatting with object properties or positional arguments.

```typescript
// Object properties
'Hello {name}, you are {age} years old'.fmt({ 
  name: 'John', 
  age: 30 
});
// "Hello John, you are 30 years old"

// Nested properties with dot notation
'User: {user.name}, Email: {user.email}'.fmt({
  user: { name: 'Alice', email: 'alice@example.com' }
});
// "User: Alice, Email: alice@example.com"

// Array index access
'First: {users.0.name}, Second: {users.1.name}'.fmt({
  users: [{ name: 'John' }, { name: 'Jane' }]
});
// "First: John, Second: Jane"

// Positional arguments
'First: {0}, Second: {1}, Third: {2}'.fmt('one', 'two', 'three');
// "First: one, Second: two, Third: three"

// Case insensitive
'Hello {NAME}'.fmt({ name: 'World' }); // "Hello World"

// Multiple occurrences
"{name} likes {name}'s code".fmt({ name: 'Bob' });
// "Bob likes Bob's code"
```

**Features:**
- Object property access with dot notation
- Array index access
- Positional arguments
- Case-insensitive placeholders
- Multiple occurrences supported
- Handles special characters, booleans, null, undefined

---

## Additional Utilities

### Random Number Generation

```typescript
import { random } from '@rniverse/utils';

// Random integer (inclusive)
const dice = random.int(1, 6);

// Random float
const value = random.float(0, 100);
const precise = random.float(0.5, 1.5);
```

### Password Hashing

Re-export of Bun's built-in password utilities using bcrypt algorithm.

```typescript
import { password } from '@rniverse/utils';

// Hash a password with automatic salt generation
const hashed = await password.hash('myPassword123');
// Returns bcrypt hash: $2b$10$...

// Verify a password against hash
const isValid = await password.verify('myPassword123', hashed);
// Returns: true or false

// With custom options
const hashed = await password.hash('myPassword123', {
  algorithm: 'bcrypt',
  cost: 10, // Number of rounds (4-31)
});
```

**Note:** Uses Bun's optimized bcrypt implementation. See [Bun password documentation](https://bun.sh/docs/api/hashing#bun-password) for details.

### Third-Party Package Re-exports

The following packages are re-exported for convenience. For detailed documentation, refer to their official npm packages:

```typescript
// BullMQ - Redis-based queue for Node.js
import { bullmq } from '@rniverse/utils';
// Documentation: https://www.npmjs.com/package/bullmq

// Commander - CLI argument parsing
import { commander } from '@rniverse/utils';
// Documentation: https://www.npmjs.com/package/commander

// Undici - HTTP/1.1 client
import * as undici from '@rniverse/utils';
// Documentation: https://www.npmjs.com/package/undici

// Valibot - Schema validation library
import { valibot } from '@rniverse/utils';
// Documentation: https://www.npmjs.com/package/valibot

// Jose - JavaScript module for JWE, JWS, JWT, JWK
import { jose } from '@rniverse/utils';
// Documentation: https://www.npmjs.com/package/jose

// Node zlib - Compression utilities
import { zlib } from '@rniverse/utils';
// Documentation: https://nodejs.org/api/zlib.html

// Bun password - Built-in password hashing
import { password } from '@rniverse/utils';
// Documentation: https://bun.sh/docs/api/hashing#bun-password
```

---

## Type Definitions

### Object Types

```typescript
import type { TObject, TNObject } from '@rniverse/utils';

// Object with nullable values
type TObject = {
  [key: string]: TObject | TObject[] | string | number | boolean | null | undefined;
};

// Object with non-nullable values
type TNObject = {
  [key: string]: TNObject | TNObject[] | string | number | boolean;
};
```

### Template Config

```typescript
import type { TemplateConfig } from '@rniverse/utils';

type TemplateConfig = {
  hardcode?: string | number | boolean | null;
  getters?: string[];
  now?: boolean;
  default?: any;
};
```

### Request Context

```typescript
import type { TRequestContext } from '@rniverse/utils';

type TRequestContext = {
  requestId?: string;
  userId?: string;
  [key: string]: any;
};
```

---

## Path Aliases

The following TypeScript path aliases are configured:

```typescript
// Utils
import { ... } from '@utils';
import { ... } from '@utils/lodash';
import { ... } from '@utils/logger';
// etc.

// Types
import type { ... } from '@type';
import type { ... } from '@type/object';

// Context
import { ... } from '@context';
import { cxt$req } from '@context/req.context';
```

---

## Best Practices

### Request Context

Serve through `cxt$req.bindFetch` so every request gets an isolated store; use
`runWithContext` for scripts and jobs:

```typescript
// ✅ HTTP
Bun.serve({ fetch: cxt$req.bindFetch((req) => app.handle(req)) });

// ✅ script / job
runWithContext(() => processJob(), { userId });

// ❌ Bad
processJob(); // no context, logs missing reqId
```

### Logger Usage

Use structured logging for better observability:

```typescript
// ✅ Good
log.info({ userId, action: 'login', ip: req.ip }, 'User logged in');

// ❌ Bad
log.info(`User ${userId} logged in from ${req.ip}`);
```

### ID Generation

- Use **UUID v7** for database primary keys and API identifiers
- Use **ULID** for high-throughput scenarios and when sorting by ID is important
- Use monotonic factory when generating many IDs in tight loops

### Cleanup vs PickOne

```typescript
// Use cleanup to remove nil values
const cleaned = _.cleanup({ a: 1, b: null, c: undefined });
// { a: 1 }

// Use pickOne to get first available value
const email = _.pickOne(user, ['primaryEmail', 'email', 'contactEmail']);
```

---

## Testing

Run tests with Bun:

```bash
# All tests
bun test

# Specific test file
bun test test/lodash.cleanup.test.ts

# With timeout (if needed)
bun test --timeout 10000
```

Test coverage: **82 tests, 100% passing**

See [TEST_COVERAGE.md](../TEST_COVERAGE.md) for detailed test documentation.

---

## License

Private package for internal use.

---

## Support

For questions or issues, please contact the development team.
