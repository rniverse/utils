# Quick Reference

Quick lookup for common operations.

## Installation

```bash
bun install github:rniverse/utils#dist
```

## Environment Variables

```bash
NODE_ENV=production   # → newline-JSON logs (pretty otherwise)
LOG_LEVEL=info        # trace|debug|info|warn|error|fatal|silent
LOG_PRETTY=true       # force pretty even without a TTY
```

## ID Generation

```typescript
import { uuid, ulid } from '@rniverse/utils';

uuid.generate()              // UUID v7
uuid.extractTime(id)         // Get timestamp
ulid.generate()              // ULID
ulid.extractTime(id)         // Get timestamp
ulid.ulidFactory()           // Monotonic factory
```

## Date/Time

```typescript
import { date } from '@rniverse/utils';

date()                       // Current time
date('2026-02-07').format('YYYY-MM-DD')
date().add(1, 'day')
date().subtract(2, 'hours')
date().fromNow()             // Relative time
date().calendar()            // Calendar display
date.duration(2, 'hours')
```

## JWT

```typescript
import { jose } from '@rniverse/utils'; // the `jose` library, re-exported

await new jose.SignJWT({ sub: '123' }).setProtectedHeader({ alg: 'RS256' }).sign(privateKey)
await jose.jwtVerify(token, publicKey, { algorithms: ['RS256'] })
```

## Logger

```typescript
import { log } from '@rniverse/utils';

log.info('message')
log.error(error, 'context')
log.child({ module: 'name' })
```

## Request Context

```typescript
import { cxt$req, runWithContext } from '@rniverse/utils';

// scripts / jobs
runWithContext(() => {
  // code with context
}, { userId: '123' })

// HTTP servers: wrap the fetch handler
Bun.serve({ fetch: cxt$req.bindFetch(app.handle) })

cxt$req.requestId()
cxt$req.userId()
cxt$req.get('tenant')
cxt$req.set('userId', '123')   // mutates the current store in place
cxt$req.patch({ userId: '123', tenant: 'acme' })
```

## HTTP Client (context-propagating)

```typescript
import { http, trace$ } from '@rniverse/utils';

// receiving side: adopt inbound x-request-id (x-user-id is NOT trusted)
Bun.serve({ fetch: cxt$req.bindFetch(app.handle, trace$.seed) })

// calling another internal service — x-request-id / x-user-id added automatically
const b = http({ baseURL: 'http://service-b', timeout: 5000 });
const data = await b.post('/things', { body: { name: 'x' } }); // throws HttpError on !2xx
await b.get('/things', { query: { page: 2 } });                  // GETs retry 5xx by default
await b.post('/things', { body, retries: 3 });                   // opt a POST into retry
const res = await b.send('GET', '/stream');                      // raw Response, no parse/throw

// external / third-party — do NOT leak context headers
const google = http({ baseURL: 'https://oauth2.googleapis.com', propagate: false });
```

## Lodash Extensions

```typescript
import { _ } from '@rniverse/utils';

_.cleanup({ a: 1, b: null })
_.pickOne(obj, ['key1', 'key2'], 'default')
_.templated(template, input)
_.titleCase('hello_world')
```

## String Extensions

```typescript
import '@rniverse/utils/patch';

'Hello {name}'.fmt({ name: 'World' })
'{0} + {1}'.fmt(1, 2)
```

## Random

```typescript
import { random } from '@rniverse/utils';

random.int(1, 6)
random.float(0, 100)
```

## Password

```typescript
import { password } from '@rniverse/utils';

await password.hash('secret')
await password.verify('secret', hash)
```
