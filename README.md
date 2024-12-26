# Dotenv+

Dotenv+ reads `.env` and `mode.env` files and returns them as an object. You can pass in a zod schema which will pe parsed against the keys in the env files. You can alos set required keys with conditions (check the type).

This package also export a zod schema `booleanSchema` which makes 1 and true equal to true and everything else false

## Usage

```ts
import { loadEnv, booleanSchema } from '@usama8800/dotenvplus';
import { z } from 'zod';

const env = dotenvPlus({
  required: [
  'PORT',
  'SECRET_KEY',
  'DEFAULT_USER_PASSWORD',
  'DEFAULT_USER_USERNAME',
  'CONNECTION_STRING',
  ],
  schema: z.object({
    PORT: z.coerce.number().default(3000),
    LOGGING: booleanSchema.default(true),
  }),
});
```

There are two ways to use dotenv+:
- Using imports
- Changing modes
You can use both at the same time.

`.env` file is always loaded

Any time a file is loaded, it's local file (`local.env` or `local.MODE.env`) is also loaded. Add local files to `.gitignore` and commit non local env files.

`MODE.env` files are loaded only if `MODE` is set either in `.env` or from an environment variable.

Depending on `localType` and `modeType` given in `env()` function, files names can be like `local.MODE.env`, `MODE.env.local`, or `.env.MODE.local` with or without local or MODE.

### Using imports

```properties
# .env
KEY1=VAL1
import database
import common

# database.env
CONNECTION_STRING=localhost

# common.env
import ports
SECRET=VAL2

# ports.env
PORT=3000
```

Imports are replaced with the content of the file expect lines which set MODE

### Changing modes (Old)

```properties
# .env
KEY1=VAL1
MODE=production

# production.env
CONNECTION_STRING=localhost
PORT=3000
MODE=common

# common.env
KEY2=VAL2
```

When `MODE` is set in a file, after the file is loaded, `MODE.env` is loaded until `MODE` does not change.
