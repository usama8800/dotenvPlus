import { existsSync, readFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { z } from 'zod';

type RequiredSet = string | ((env: { [key: string]: any }) => boolean) | { key: string, value: string } | { and: RequiredSet[] } | { or: RequiredSet[] };

interface EnvConfig<T> {

  /**
   * List of required environment variables
   */
  required?: RequiredSet | RequiredSet[];

  /**
   * Zod schema
   */
  schema?: z.ZodSchema<T>

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
   * Default: prefix
   *
   * Prefix or suffix of local .env files
   */
  localType?: 'prefix' | 'suffix';

  /**
   * Default: prefix
   *
   * Prefix or suffix of mode .env files
   */
  modeType?: 'prefix' | 'suffix';
};

let _env: undefined | { [key: string]: any } = undefined;
function setupEnv<T>(config?: EnvConfig<T>) {
  _env = {};
  let basePath = config?.basePath ?? '.';
  let localType = config?.localType ?? 'prefix';
  let modeType = config?.modeType ?? 'prefix';

  if (existsSync(resolve(basePath, '.env')))
    loadEnvFromLines(generateFileIncludingImports(basePath, '.env', localType, modeType));
  const localFileName = localType === 'prefix' ? 'local.env' : '.env.local';
  if (existsSync(resolve(basePath, localFileName)))
    loadEnvFromLines(generateFileIncludingImports(basePath, localType === 'prefix' ? 'local.env' : '.env.local', localType, modeType));

  _env.MODE = process.env.MODE ?? _env.MODE;
  while (true) {
    const prevMode = _env.MODE;
    if (!prevMode) break;
    const modeFileName = modeType === 'prefix' ? `${prevMode}.env` : `.env.${prevMode}`;
    const localModeFileName = localType === 'prefix' ? `local.${modeFileName}` : `${modeFileName}.local`;
    if (existsSync(resolve(basePath, modeFileName)))
      loadEnvFromLines(generateFileIncludingImports(basePath, modeFileName, localType, modeType));
    if (existsSync(resolve(basePath, localModeFileName)))
      loadEnvFromLines(generateFileIncludingImports(basePath, localModeFileName, localType, modeType));
    if (_env.MODE === prevMode) break;
  }

  if (config?.schema) {
    const parsed = config.schema.safeParse(_env);
    if (!parsed.success) throw parsed.error;
    _env = parsed.data as any;
  }

  if (config?.required) {
    let required: RequiredSet;
    if (!Array.isArray(config.required)) required = config.required;
    else required = { and: config.required };
    const missing = requiredErrorToString(requiredSolver(required, _env as any));
    if (missing) throw new Error(`Missing required environment variable: ${missing}`);
  }

  return _env;
}

function loadEnvFromLines(envLines: string[]) {
  if (!_env) _env = {};
  for (const line of envLines) {
    const parts = line.split('=');
    const key = parts[0];
    if (!key || key.startsWith('#')) continue;
    const val = parts.slice(1).join('=');
    _env[key] = val;
  }
}

function generateFileIncludingImports(dir: string, filename: string, localType: 'prefix' | 'suffix', modeType: 'prefix' | 'suffix'): string[] {
  const lines = readFileSync(resolve(dir, filename), 'utf8').split(/[\r\n]+/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('import ')) {
      const importPath = line.slice('import '.length)
      const importDir = dirname(importPath);
      const importFilename = modeType === 'prefix' ? `${basename(importPath)}.env` : `.env.${basename(importPath)}`;
      const localImportFilename = localType === 'prefix' ? `local.${importFilename}` : `${importFilename}.local`;
      const importFileExists = existsSync(resolve(dir, importDir, importFilename));
      const localImportFileExists = existsSync(resolve(dir, importDir, localImportFilename));
      const importedLines: string[] = [];
      if (localImportFileExists)
        importedLines.push(...generateFileIncludingImports(resolve(dir, importDir), localImportFilename, localType, modeType));
      if (importFileExists)
        importedLines.push(...generateFileIncludingImports(resolve(dir, importDir), importFilename, localType, modeType));
      lines.splice(i, 1, ...importedLines.filter(l => !l.startsWith('MODE=')));
    }
  }
  return lines;
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

  @returns { T }
*/
export function loadEnv<T = NodeJS.ProcessEnv>(config?: EnvConfig<T>): T {
  if (config?.setup || !_env) {
    setupEnv<T>(config);
  }
  return _env as T;
}

type RequiredError = {
  string?: string;
  and?: [number, RequiredError];
  or?: RequiredError[];
  kv?: {
    key: string;
    value: string;
  },
};

function requiredErrorToString(requiredError?: RequiredError): string {
  if (!requiredError) return '';
  if ('string' in requiredError) {
    return requiredError.string!;
  } else if ('and' in requiredError) {
    const [index, error] = requiredError.and!;
    return `${requiredErrorToString(error)}`;
  } else if ('or' in requiredError) {
    return `[${requiredError.or!.map(requiredErrorToString).join(', ')}]`;
  } else if ('kv' in requiredError) {
    return `${requiredError.kv!.key}=${requiredError.kv!.value}`;
  } else {
    throw new Error('Invalid required error');
  }
}

function requiredSolver(requiredSet: RequiredSet, _env: { [key: string]: any }): RequiredError | undefined {
  if (typeof requiredSet === 'string') {
    if (!Object.keys(_env).includes(requiredSet)) {
      return { string: requiredSet };
    }
  } else if ('and' in requiredSet) {
    for (let i = 0; i < requiredSet.and.length; i++) {
      const missing = requiredSolver(requiredSet.and[i], _env);
      if (missing) return { and: [i, missing] };
    }
  } else if ('or' in requiredSet) {
    let found = false;
    const missingArray: RequiredError[] = [];
    for (const required of requiredSet.or) {
      const missing = requiredSolver(required, _env);
      if (!missing) {
        found = true;
        break;
      }
      missingArray.push(missing);
    }
    if (!found) return { or: missingArray };
  } else if ('key' in requiredSet && 'value' in requiredSet) {
    if (_env[requiredSet.key] !== requiredSet.value)
      return { kv: { key: requiredSet.key, value: requiredSet.value } };
  } else {
    throw new Error('Invalid required set');
  }
}

export const booleanSchema = z.preprocess((val) => {
  if (!val) return undefined;
  if (typeof val === 'string' && ['1', 'true'].includes(val.toLowerCase())) return true;
  return false;
}, z.boolean());
