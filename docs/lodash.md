# Lodash Extensions

Extended lodash library with custom utility functions for common operations.

## Import

```typescript
import { _ } from '@rniverse/utils';
```

All standard lodash functions are available plus the following custom extensions.

---

## cleanup

Remove nil (null/undefined) values from objects and arrays recursively.

### Signature

```typescript
cleanup(obj: any, clear?: (value: any) => boolean): any
```

### Parameters

- `obj` - Object or array to clean
- `clear` - Optional function to determine if value should be removed (default: removes null/undefined)

### Examples

#### Basic Cleanup

```typescript
const data = { a: 1, b: null, c: undefined, d: 4 };
const cleaned = _.cleanup(data);
// { a: 1, d: 4 }
```

#### Preserve Falsy Values

```typescript
const data = { a: 0, b: false, c: '', d: null };
const cleaned = _.cleanup(data);
// { a: 0, b: false, c: '' }
```

#### Nested Objects

```typescript
const data = {
  a: 1,
  b: { x: 2, y: null, z: 3 },
  c: null,
};
const cleaned = _.cleanup(data);
// { a: 1, b: { x: 2, z: 3 } }
```

#### Arrays

```typescript
const data = [
  { a: 1, b: null },
  { c: 2, d: undefined },
  { e: 3 }
];
const cleaned = _.cleanup(data);
// [{ a: 1 }, { c: 2 }, { e: 3 }]
```

#### Custom Clear Function

Remove empty strings:

```typescript
const data = { a: 'hello', b: '', c: 'world', d: '' };
const cleaned = _.cleanup(data, (v) => v === '');
// { a: 'hello', c: 'world' }
```

Remove zero values:

```typescript
const data = { a: 1, b: 0, c: 2, d: 0 };
const cleaned = _.cleanup(data, (v) => v === 0);
// { a: 1, c: 2 }
```

Remove values less than threshold:

```typescript
const data = { a: 10, b: 20, c: 30, d: 5 };
const cleaned = _.cleanup(data, (v) => typeof v === 'number' && v < 15);
// { b: 20, c: 30 }
```

### Notes

- Does not mutate original object
- Recursively processes nested objects and arrays
- Array elements are not filtered, only object properties within arrays

---

## pickOne

Get first non-nil value from multiple object keys/paths with optional default.

### Signature

```typescript
pickOne<T>(
  obj: T,
  keys: string[] | string,
  default?: T[keyof T]
): any
```

### Parameters

- `obj` - Object to search
- `keys` - Array of keys/paths or single key/path
- `default` - Optional default value if no keys found

### Examples

#### Basic Usage

```typescript
const obj = { name: 'Alice', age: 25 };
const result = _.pickOne(obj, ['name', 'age']);
// 'Alice'
```

#### Fall Back to Second Key

```typescript
const obj = { name: null, age: 25 };
const result = _.pickOne(obj, ['name', 'age']);
// 25
```

#### Nested Properties

```typescript
const obj = {
  user: {
    profile: {
      name: 'John'
    }
  }
};
const result = _.pickOne(obj, ['user.profile.name', 'fallback']);
// 'John'
```

#### Array Access

```typescript
const obj = {
  users: [
    { name: 'Alice' },
    { name: 'Bob' }
  ]
};
const result = _.pickOne(obj, ['users[0].name', 'fallback']);
// 'Alice'

const result2 = _.pickOne(obj, 'users[1].name');
// 'Bob'
```

#### With Default Value

```typescript
const obj = { a: 1 };
const result = _.pickOne(obj, ['x', 'y'], 'default');
// 'default'
```

#### Single Key String

```typescript
const obj = { email: 'user@example.com' };
const result = _.pickOne(obj, 'email');
// 'user@example.com'

// Works with nested paths
const obj2 = { user: { settings: { theme: 'dark' } } };
const result2 = _.pickOne(obj2, 'user.settings.theme');
// 'dark'
```

### Notes

- Skips null and undefined values
- Treats 0, false, and empty string as valid values
- Returns undefined if no keys found and no default provided

---

## templated

Transform input data using template configuration with priority-based field resolution.

### Signature

```typescript
templated(
  template: { [key: string]: TemplateConfig },
  input: TObject
): TObject
```

### TemplateConfig

```typescript
type TemplateConfig = {
  hardcode?: string | number | boolean | null;
  getters?: string[];
  now?: boolean;
  default?: any;
};
```

**Priority order:**
1. `hardcode` - Use hardcoded value
2. `getters` - Try to get value from input using getter paths
3. `now` - Generate current timestamp
4. `default` - Use default value if all above fail

### Examples

#### Hardcode Values

```typescript
const template = {
  name: { hardcode: 'John Doe' },
  age: { hardcode: 25 },
  isActive: { hardcode: true },
};
const result = _.templated(template, {});
// { name: 'John Doe', age: 25, isActive: true }
```

#### Getters with Fallback

```typescript
const template = {
  name: { getters: ['userName', 'fullName'] },
  email: { getters: ['primaryEmail', 'email'] },
};
const input = {
  fullName: 'Bob Smith',
  email: 'bob@example.com'
};
const result = _.templated(template, input);
// { name: 'Bob Smith', email: 'bob@example.com' }
```

#### Nested Property Getters

```typescript
const template = {
  username: { getters: ['user.profile.name'] },
  email: { getters: ['user.profile.email'] },
};
const input = {
  user: {
    profile: {
      name: 'Charlie',
      email: 'charlie@example.com'
    }
  }
};
const result = _.templated(template, input);
// { username: 'Charlie', email: 'charlie@example.com' }
```

#### Timestamp Generation

```typescript
const template = {
  createdAt: { now: true },
  updatedAt: { now: true },
};
const result = _.templated(template, {});
// { createdAt: '2026-02-07T10:30:45.123Z', updatedAt: '2026-02-07T10:30:45.123Z' }
```

#### Default Values

```typescript
const template = {
  name: { getters: ['firstName'], default: 'Unknown' },
  status: { default: 'active' },
  role: { getters: ['userRole'], default: 'user' },
};
const result = _.templated(template, {});
// { name: 'Unknown', status: 'active', role: 'user' }
```

#### Nested Output Paths

```typescript
const template = {
  'user.name': { getters: ['name'] },
  'user.age': { hardcode: 30 },
  'settings.theme': { default: 'dark' },
};
const input = { name: 'Helen' };
const result = _.templated(template, input);
// {
//   user: { name: 'Helen', age: 30 },
//   settings: { theme: 'dark' }
// }
```

#### Complete Example (OAuth)

```typescript
const template = {
  firstname: { getters: ['given_name'] },
  lastname: { getters: ['family_name'] },
  email: { getters: ['email'] },
  avatar: { getters: ['picture'] },
  provider_id: { getters: ['sub'] },
  fullname: { getters: ['name'] },
  verified: { getters: ['email_verified'], default: false },
};

const googleUser = {
  sub: '117822063253329467524',
  email: 'user@gmail.com',
  email_verified: true,
  name: 'John Doe',
  picture: 'https://example.com/photo.jpg',
  given_name: 'John',
  family_name: 'Doe',
};

const result = _.templated(template, googleUser);
// {
//   firstname: 'John',
//   lastname: 'Doe',
//   email: 'user@gmail.com',
//   avatar: 'https://example.com/photo.jpg',
//   provider_id: '117822063253329467524',
//   fullname: 'John Doe',
//   verified: true
// }
```

#### Priority Example

```typescript
const template = {
  // hardcode wins
  field1: { hardcode: 'A', getters: ['x'], now: true, default: 'D' },
  
  // getter wins over now
  field2: { getters: ['y'], now: true, default: 'D' },
  
  // now generates timestamp
  field3: { now: true, default: 'D' },
  
  // default only
  field4: { default: 'D' },
};

const input = { y: 'Y' };
const result = _.templated(template, input);
// {
//   field1: 'A',
//   field2: 'Y',
//   field3: '2026-02-07T10:30:45.123Z',
//   field4: 'D'
// }
```

### Use Cases

- Transform API responses to internal format
- Map OAuth provider data to user schema
- Transform database records for API responses
- Apply default values and transformations

---

## titleCase

Convert strings to title case (each word capitalized).

### Signature

```typescript
titleCase(str: string): string
```

### Examples

```typescript
// Simple strings
_.titleCase('hello world');        // "Hello World"
_.titleCase('HELLO WORLD');        // "Hello World"

// camelCase
_.titleCase('helloWorld');         // "Hello World"
_.titleCase('firstName');          // "First Name"

// snake_case
_.titleCase('hello_world');        // "Hello World"
_.titleCase('first_name_last');    // "First Name Last"

// kebab-case
_.titleCase('hello-world');        // "Hello World"
_.titleCase('first-name');         // "First Name"

// Mixed formats
_.titleCase('helloWorld_test-case'); // "Hello World Test Case"
_.titleCase('API_KEY');              // "Api Key"

// With numbers
_.titleCase('user123name');        // "User 123 Name"
_.titleCase('test_case_1');        // "Test Case 1"

// Database columns
_.titleCase('user_id');            // "User Id"
_.titleCase('created_at');         // "Created At"
_.titleCase('is_active');          // "Is Active"

// API endpoints
_.titleCase('get-user-profile');   // "Get User Profile"
_.titleCase('post_user_data');     // "Post User Data"

// Empty/single
_.titleCase('');                   // ""
_.titleCase('hello');              // "Hello"
```

### Notes

- Handles camelCase, snake_case, kebab-case, and mixed formats
- Converts acronyms (HTTP, XML) to title case
- Useful for display labels from database column names or API keys

---

## All Standard Lodash Functions

All lodash functions are available:

```typescript
// Array
_.chunk, _.compact, _.concat, _.difference, _.drop, _.fill, 
_.findIndex, _.flatten, _.head, _.indexOf, _.intersection, 
_.join, _.last, _.pull, _.remove, _.reverse, _.slice, 
_.sortBy, _.tail, _.take, _.union, _.uniq, _.without, _.zip

// Collection
_.countBy, _.every, _.filter, _.find, _.forEach, _.groupBy, 
_.includes, _.keyBy, _.map, _.orderBy, _.reduce, _.reject, 
_.sample, _.shuffle, _.size, _.some, _.sortBy

// Object
_.assign, _.clone, _.cloneDeep, _.defaults, _.get, _.has, 
_.keys, _.merge, _.omit, _.pick, _.set, _.values

// String
_.camelCase, _.capitalize, _.kebabCase, _.lowerCase, _.snakeCase, 
_.startCase, _.toLower, _.toUpper, _.trim, _.truncate, _.upperCase

// Utility
_.identity, _.isArray, _.isBoolean, _.isDate, _.isEmpty, 
_.isEqual, _.isFunction, _.isNil, _.isNull, _.isNumber, 
_.isObject, _.isString, _.isUndefined

// Math
_.add, _.ceil, _.divide, _.floor, _.max, _.maxBy, _.mean, 
_.min, _.minBy, _.multiply, _.round, _.subtract, _.sum

// And many more...
```

See [Lodash documentation](https://lodash.com/docs/) for complete API reference.
