# Dotenv+

Dotenv+ reads `.env` and `mode.env` files and returns them as an object. You can map keys, have default values for keys, and set required keys. 

## Usage

```ts
import dotenvPlus from '@usama8800/dotenvplus';

const env = dotenvPlus<{
  MODE: string;
  PORT: number;
  SECRET_KEY: string;
  DEFAULT_USER_PASSWORD: string;
  DEFAULT_USER_USERNAME: string;
  CONNECTION_STRING: string;
  LOGGING: boolean;
  DISCORD_HOOK?: string;
}>({
  required: [
  'PORT',
  'SECRET_KEY',
  'DEFAULT_USER_PASSWORD',
  'DEFAULT_USER_USERNAME',
  'CONNECTION_STRING',
  ],
  defaults: {
    PORT: 3000,
    LOGGING: true,
  },
  maps: {
    PORT: parseInt,
    LOGGING: (val: string) => val.toLowerCase() === 'true',
  },
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
