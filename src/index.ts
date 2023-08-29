import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

type RequiredSet = string | ((env: { [key: string]: any }) => boolean) | { key: string, value: string } | { and: RequiredSet[] } | { or: RequiredSet[] };

interface EnvConfig {
  /**
   * Default values for environment variables
   */
  defaults?: { [key: string]: any };

  /**
   * Map values if default is not used
   */
  maps?: { [key: string]: (val: string) => any };

  /**
   * List of required environment variables
   */
  required?: RequiredSet | RequiredSet[];

  /**
   * Default: `.`
   *
   * Location of env files
   */
  basePath?: string;

  /**
   * Rereads files (without overriding unless override is true)
   * No need to use for the first time this function is run
   */
  setup?: boolean;

  /**
   * Default: `false`
   *
   * Passed to dotenv
   */
  override?: boolean;

  /**
   * Default: `'utf8'`
   *
   * Passed to dotenv
   */
  encoding?: string;
};

let _env: undefined | { [key: string]: any } = undefined;
function setupEnv(config?: EnvConfig) {
  let basePath = config?.basePath ?? '.';
  const originalMode = process.env.MODE;
  dotenv.config({
    path: resolve(basePath, '.env'),
    override: config?.override,
    encoding: config?.encoding,
  });
  if (existsSync(resolve(basePath, '.env.local'))) {
    dotenv.config({
      override: config?.override,
      encoding: config?.encoding,
      path: resolve(basePath, '.env.local')
    });
  }
  const secondaryMode = process.env.MODE;
  process.env.MODE = originalMode ?? secondaryMode;
  while (true) {
    const prevMode = process.env.MODE;
    if (existsSync(resolve(basePath, `.env.${process.env.MODE}`))) {
      dotenv.config({
        override: config?.override,
        encoding: config?.encoding,
        path: resolve(basePath, `.env.${process.env.MODE}`)
      });
    }
    if (existsSync(resolve(basePath, `.env.${process.env.MODE}.local`))) {
      dotenv.config({
        override: config?.override,
        encoding: config?.encoding,
        path: resolve(basePath, `.env.${process.env.MODE}.local`)
      });
    }
    if (process.env.MODE === prevMode) break;
  }
  process.env.MODE = originalMode ?? secondaryMode;
  _env = {};
  for (const key in process.env) {
    if (Object.prototype.hasOwnProperty.call(process.env, key)) {
      _env[key] = process.env[key];
    }
  }

  if (config?.maps)
    for (const key in config.maps) {
      if (Object.prototype.hasOwnProperty.call(config.maps, key) && Object.prototype.hasOwnProperty.call(_env, key)) {
        _env[key] = config.maps[key](_env[key]);
      }
    }

  if (config?.defaults)
    for (const key in config.defaults) {
      if (Object.prototype.hasOwnProperty.call(config.defaults, key)) {
        _env[key] = _env[key] ?? config.defaults[key];
      }
    }

  if (config?.required) {
    let required: RequiredSet;
    if (!Array.isArray(config.required)) required = config.required;
    else required = { and: config.required };
    const missing = requiredSolver(required, _env);
    if (missing) throw new Error(`Missing required environment variable: ${missing}`);
  }

  return _env;
}

/**
  Loads environment variables from .env files and returns them as an object.

  The following files are loaded in order:
  - .env
  - .env.local
  - .env.[MODE]
  - .env.[MODE].local

  MODE can be changed in an env file by setting the MODE variable.
  .env.[MODE] files are loaded in order until the MODE variable does not change.

  @param {EnvConfig} [config]

  @returns { (NodeJS.ProcessEnv | T) }
*/
export function env<T = NodeJS.ProcessEnv>(config?: EnvConfig) {
  if (config?.setup || !_env) {
    setupEnv(config);
  }
  return _env as T;
}

export default env;

function requiredSolver(requiredSet: RequiredSet, _env: { [key: string]: any }): string | undefined {
  if (typeof requiredSet === 'string') {
    if (!Object.keys(_env).includes(requiredSet)) {
      return requiredSet;
    }
  } else if ('and' in requiredSet) {
    for (const required of requiredSet.and) {
      const missing = requiredSolver(required, _env);
      if (missing) return missing;
    }
  } else if ('or' in requiredSet) {
    let found = false;
    const missingArray: (string | undefined)[] = [];
    for (const required of requiredSet.or) {
      const missing = requiredSolver(required, _env);
      if (!missing) {
        found = true;
        break;
      }
      missingArray.push(missing);
    }
    if (!found) return missingArray.filter(x => x).join(', ');
  } else if ('key' in requiredSet && 'value' in requiredSet) {
    if (_env[requiredSet.key] !== requiredSet.value) return requiredSet.key;
  } else {
    if (!requiredSet(_env)) return "";
  }
}
