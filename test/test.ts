import setup from "../src/index";

let _env: { [key: string]: any } = setup({
  basePath: 'test',
  defaults: {
    ONLY_DEFAULT: 'default',
    MAPPED_AND_DEFAULT_EXISTING: 'default',
    MAPPED_AND_DEFAULT_MISSING: 'default',
  },
  maps: {
    ONLY_MAPPED: val => val.toLowerCase() === 'true',
    MAPPED_AND_DEFAULT_EXISTING: val => val.toLowerCase() === 'true',
    MAPPED_AND_DEFAULT_MISSING: val => val.toLowerCase() === 'true',
  },
  required: ['REQUIRED_EXISTING'],
});

console.assert(_env.ONLY_DEFAULT === 'default', `Expected _env.ONLY_DEFAULT to be "default", got ${_env.ONLY_DEFAULT}`);
console.assert(_env.ONLY_MAPPED === undefined, `Expected _env.ONLY_MAPPED to be undefined, got ${_env.ONLY_MAPPED}`);
console.assert(_env.MAPPED_AND_DEFAULT_EXISTING === true, `Expected _env.MAPPED_AND_DEFAULT_EXISTING to be true, got ${_env.MAPPED_AND_DEFAULT_EXISTING} ${typeof _env.MAPPED_AND_DEFAULT_EXISTING}`);
console.assert(_env.MAPPED_AND_DEFAULT_MISSING === 'default', `Expected _env.MAPPED_AND_DEFAULT_MISSING to be "default", got ${_env.MAPPED_AND_DEFAULT_MISSING}`);

try {
  _env = setup({
    setup: true,
    basePath: 'test',
    required: ['REQUIRED_MISSING'],
  });
  console.assert(false, 'Expected error to be thrown');
} catch (error: any) {
  console.assert(error.message === 'Missing required environment variable: REQUIRED_MISSING', `Expected error message to be "Missing required environment variable: REQUIRED_MISSING", got "${error.message}"`);
}

console.log('Test passed!');
