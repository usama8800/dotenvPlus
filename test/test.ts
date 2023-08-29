import setup from "../src/index";

// TEST 1
console.log('Test 1');
let _env: { [key: string]: any } = setup({
  basePath: 'test',
  defaults: {
    T1_2_ONLY_DEFAULT: 'default',
    T1_2_MAPPED_AND_DEFAULT_EXISTING: 'default',
    T1_2_MAPPED_AND_DEFAULT_MISSING: 'default',
  },
  maps: {
    T1_2_ONLY_MAPPED: val => val.toLowerCase() === 'true',
    T1_2_MAPPED_AND_DEFAULT_EXISTING: val => val.toLowerCase() === 'true',
    T1_2_MAPPED_AND_DEFAULT_MISSING: val => val.toLowerCase() === 'true',
  },
  required: ['T1_2_REQUIRED_EXISTING'],
});

console.assert(_env.T1_2_ONLY_DEFAULT === 'default', `Expected _env.T1_2_ONLY_DEFAULT to be "default", got ${_env.T1_2_ONLY_DEFAULT}`);
console.assert(_env.T1_2_ONLY_MAPPED === undefined, `Expected _env.T1_2_ONLY_MAPPED to be undefined, got ${_env.T1_2_ONLY_MAPPED}`);
console.assert(_env.T1_2_MAPPED_AND_DEFAULT_EXISTING === true, `Expected _env.T1_2_MAPPED_AND_DEFAULT_EXISTING to be true, got ${_env.T1_2_MAPPED_AND_DEFAULT_EXISTING} ${typeof _env.T1_2_MAPPED_AND_DEFAULT_EXISTING}`);
console.assert(_env.T1_2_MAPPED_AND_DEFAULT_MISSING === 'default', `Expected _env.T1_2_MAPPED_AND_DEFAULT_MISSING to be "default", got ${_env.T1_2_MAPPED_AND_DEFAULT_MISSING}`);

// TEST 2
console.log('Test 2');
try {
  _env = setup({
    setup: true,
    basePath: 'test',
    required: ['T1_2_REQUIRED_MISSING'],
  });
  console.assert(false, 'Expected error to be thrown');
} catch (error: any) {
  console.assert(error.message === 'Missing required environment variable: T1_2_REQUIRED_MISSING', `Expected error message to be "Missing required environment variable: T1_2_REQUIRED_MISSING", got "${error.message}"`);
}

// TEST 3
console.log('Test 3');
process.env.MODE = 'test3';
_env = setup({
  setup: true,
  basePath: 'test',
  required: ['T3_REQUIRED_ALWAYS', { or: [{ and: [{ key: 'T3_REQUIRED', value: '1' }, 'T3_REQUIRED_IF_1'] }, { and: [{ key: 'T3_REQUIRED', value: '2' }, 'T3_REQUIRED_IF_2'] }] }],
});

// TEST 4
console.log('Test 4');
process.env.MODE = 'test4';
try {
  _env = setup({
    setup: true,
    basePath: 'test',
    required: ['T4_REQUIRED_ALWAYS', { or: [{ and: [{ key: 'T4_REQUIRED', value: '1' }, 'T4_REQUIRED_IF_1'] }, { and: [{ key: 'T4_REQUIRED', value: '2' }, 'T4_REQUIRED_IF_2'] }] }],
  });
  console.assert(false, 'Expected error to be thrown');
} catch (error: any) {
  console.assert(error.message === 'Missing required environment variable: T4_REQUIRED_IF_1, T4_REQUIRED', `Expected error message to be "Missing required environment variable: T4_REQUIRED_IF_1, T4_REQUIRED", got "${error.message}"`);
}

console.log('Test passed!');
