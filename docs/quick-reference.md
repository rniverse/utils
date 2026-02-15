# Quick Reference

Quick lookup for common operations.

## Installation

```bash
bun install github:rniverse/utils#dist
```

## Environment Variables

```bash
JWT_SECRET=your-secret-key
JWT_ACCESS_TOKEN_EXPIRES_IN=3600
JWT_REFRESH_TOKEN_EXPIRES_IN=604800
LOG_LEVEL=info
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
import { jwt$ } from '@rniverse/utils';

await jwt$.sign({ userId: '123' })
await jwt$.verify(token)
jwt$.getSecretKey('secret')
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
import { cxt$req } from '@rniverse/utils';

cxt$req.withRequestId({ userId: '123' })(() => {
  // code with context
})
cxt$req.getRequestId()
cxt$req.getUserId()
cxt$req.setUserId('123')
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
import '@rniverse/utils/lib/patch';

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
