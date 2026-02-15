# @rniverse/utils

A comprehensive utility library for TypeScript/Bun applications, providing common functionality for logging, datetime handling, ID generation, JWT operations, and more.

## Table of Contents

- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Core Utilities](#core-utilities)
  - [Lodash Extensions](#lodash-extensions)
  - [ID Generation](#id-generation)
  - [DateTime](#datetime)
  - [JWT Operations](#jwt-operations)
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
| `JWT_SECRET` | Secret key for JWT signing/verification | `'your-secret-key-change-in-production'` |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | Access token expiry in seconds | `'3600'` (1 hour) |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | Refresh token expiry in seconds | `'604800'` (7 days) |
| `LOG_LEVEL` | Logging level (trace, debug, info, warn, error, fatal) | `'info'` |

### Setting Environment Variables

**.env file:**
```bash
JWT_SECRET=your-production-secret-key-here
JWT_ACCESS_TOKEN_EXPIRES_IN=7200
JWT_REFRESH_TOKEN_EXPIRES_IN=1209600
LOG_LEVEL=debug
```

**Example with different environments:**
```bash
# Development
LOG_LEVEL=debug
JWT_SECRET=dev-secret-key

# Production
LOG_LEVEL=info
JWT_SECRET=prod-secure-random-key-256-bits
JWT_ACCESS_TOKEN_EXPIRES_IN=1800
```

## Quick Start

```typescript
import { log, uuid, ulid, date, jwt$, _, cxt$req } from '@rniverse/utils';
import '@rniverse/utils/lib/patch'; // For string extensions

// Generate IDs
const id = uuid.generate();
const ulidId = ulid.generate();

// Format dates
const now = date().format('YYYY-MM-DD HH:mm:ss');

// Use lodash with custom extensions
const cleaned = _.cleanup({ a: 1, b: null, c: undefined }); // { a: 1 }

// JWT operations
const token = await jwt$.sign({ userId: '123' });
const verified = await jwt$.verify(token);

// Logging with request context
cxt$req.withRequestId(() => {
  log.info('Request started');
})();
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

### JWT Operations

JWT token signing and verification using Jose library.

#### Import

```typescript
import { jwt$ } from '@rniverse/utils';
```

#### Configuration

Configure via environment variables (see [Environment Variables](#environment-variables) section):

```bash
JWT_SECRET=your-256-bit-secret-key
JWT_ACCESS_TOKEN_EXPIRES_IN=3600    # 1 hour
JWT_REFRESH_TOKEN_EXPIRES_IN=604800 # 7 days
```

#### Sign Tokens

```typescript
// Basic usage
const token = await jwt$.sign({ userId: '123', email: 'user@example.com' });

// With options
const token = await jwt$.sign(
  { userId: '123', role: 'admin' },
  {
    expiresIn: 7200, // 2 hours in seconds
    issuer: 'my-app',
    audience: 'my-users',
  }
);

// Custom secret
const customSecret = jwt$.getSecretKey('my-secret');
const token = await jwt$.sign(
  { userId: '123' },
  { secret: customSecret }
);
```

**Sign Options:**
```typescript
type JWTSignOptions = {
  expiresIn?: number | string; // in seconds
  alg?: string;               // default: 'HS256'
  issuer?: string;            // default: 'rnivguard'
  audience?: string;          // default: 'rnivguard-users'
  secret?: Uint8Array;
};
```

#### Verify Tokens

```typescript
// Basic verification
const result = await jwt$.verify(token);

if (result.valid) {
  console.log(result.payload);  // Token payload
  console.log(result.userId);   // Extracted from 'sub' claim
  console.log(result.orgId);    // Extracted from 'org' claim
} else {
  console.error(result.error);  // Error message
}

// With custom options
const result = await jwt$.verify(token, {
  issuer: 'my-app',
  audience: 'my-users',
  secret: customSecret,
});
```

**Verify Response:**
```typescript
// Success
{
  valid: true,
  payload: object,
  userId: string,
  orgId: string,
}

// Failure
{
  valid: false,
  error: string,
}
```

#### Get Secret Key

```typescript
// Default secret
const secret = jwt$.getSecretKey();

// Custom secret
const customSecret = jwt$.getSecretKey('my-custom-secret');
```

---

### Logger

Pino-based logger with request context integration and pretty printing.

#### Import

```typescript
import { log } from '@rniverse/utils';
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
cxt$req.withRequestId({ userId: 'user-123' })(() => {
  log.info('Request started');
  // Output: [req_id:018d...] [user_id:user-123] Request started
  
  performOperation();
  
  log.info('Request completed');
  // Same req_id throughout the request
});

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

Async local storage for request-scoped data.

#### Import

```typescript
import { cxt$req } from '@rniverse/utils';
```

#### Generate Request ID

```typescript
// Generate and set request ID with custom data
cxt$req.withRequestId({ 
  userId: 'user-123', 
  tenant: 'acme-corp' 
})(() => {
  // All code here has access to the context
  const requestId = cxt$req.getRequestId(); // Generated UUID v7
  const userId = cxt$req.getUserId();       // 'user-123'
  
  log.info('Request processing');
});
```

#### Get Context Values

```typescript
// Get request ID (returns null if not set)
const requestId = cxt$req.getRequestId();

// Get user ID
const userId = cxt$req.getUserId();

// Get any context value
const tenant = cxt$req.getContextValue('tenant');
```

#### Set Context Values

```typescript
// Set user ID
cxt$req.setUserId('user-456');

// Set any context value
cxt$req.setRequestContext('sessionId', 'session-789');
```

#### Get Raw Context

```typescript
const context = cxt$req.getContext();
// Returns: AsyncLocalStorage<TRequestContext>
```

#### Context Type

```typescript
type TRequestContext = {
  requestId?: string;
  userId?: string;
  [key: string]: any;
};
```

#### Example: Express Middleware

```typescript
import { cxt$req, log } from '@rniverse/utils';

app.use((req, res, next) => {
  cxt$req.withRequestId({ 
    userId: req.user?.id,
    ipAddress: req.ip,
  })(() => {
    next();
  })();
});

// In any route handler or service
app.get('/users', (req, res) => {
  // Context is automatically available
  log.info('Fetching users');
  // Output includes req_id and user_id automatically
});
```

#### Example: Async Operations with Context

```typescript
import { cxt$req, log } from '@rniverse/utils';

async function processRequest(userId: string) {
  // Create context for the entire async operation
  const handler = cxt$req.withRequestId({ userId });
  
  await handler(async () => {
    log.info('Starting request processing');
    
    // All async operations maintain the same context
    await fetchUserData();
    await processPayment();
    await sendNotification();
    
    log.info('Request completed');
    // All logs above will have the same req_id and user_id
  });
}

async function fetchUserData() {
  // No need to pass context - it's automatic
  log.info('Fetching user data');
  await db.query('SELECT * FROM users WHERE id = ?', [cxt$req.getUserId()]);
}
```

#### Example: Parallel Requests with Isolated Context

```typescript
import { cxt$req, log } from '@rniverse/utils';

// Each request gets its own isolated context
const promises = ['user1', 'user2', 'user3'].map(userId => {
  return cxt$req.withRequestId({ userId })(async () => {
    log.info('Processing user');
    await processUser(userId);
    log.info('User processed');
    // Each user's logs will have different req_id
  });
});

await Promise.all(promises);
```

#### Example: Nested Service Calls

```typescript
import { cxt$req, log } from '@rniverse/utils';

class UserService {
  async createUser(data: any) {
    log.info('Creating user');
    const user = await db.insert('users', data);
    
    // Context is preserved across service boundaries
    await this.emailService.sendWelcomeEmail(user.email);
    await this.analyticsService.track('user_created', user.id);
    
    return user;
  }
}

class EmailService {
  async sendWelcomeEmail(email: string) {
    // Automatically has the same req_id as parent call
    log.info({ email }, 'Sending welcome email');
    await sendEmail(email, 'welcome');
  }
}
```

---

### String Extensions

Custom string prototype extensions for formatting.

#### Import

```typescript
import '@rniverse/utils/lib/patch';
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

Always wrap request handlers with `withRequestId()`:

```typescript
// ✅ Good
cxt$req.withRequestId({ userId: req.user?.id })(() => {
  // All logs will include req_id automatically
  processRequest();
});

// ❌ Bad
processRequest(); // No request context, logs missing req_id
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
