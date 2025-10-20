import { expect } from "chai";
import { z } from "zod";
import { loadEnv as setup } from "../../src/index";

describe('Base', () => {
  beforeEach(() => {
    delete process.env.MODE;
  });

  it('Does not require .env', () => {
    setup({ setup: true, schema: z.object({}) });
  });

  it('Reads .env always', () => {
    process.env.MODE = 'test1';
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({ SET_IN_ENV: z.string() }),
    });
    expect(_env.SET_IN_ENV).to.equal('1');
  });

  it('Reads local.env always', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({ SET_IN_LOCAL_ENV: z.string() }),
    });
    expect(_env.SET_IN_LOCAL_ENV).to.equal('1');
  });

  it('Overrides .env.MODE with process.env.MODE', () => {
    process.env.MODE = 'required';
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({}),
    });
    expect(_env.SET_IN_MODE).to.not.be.ok;
  });

  it('Moves from mode.env to local.mode.env', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({ SET_IN_LOCAL_MODE: z.string() }),
    });
    expect(_env.SET_IN_LOCAL_MODE).to.equal('1');
  });

  it('Moves from .env to mode.env to required.env', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({ SET_IN_REQUIRED: z.string() }),
    });
    expect(_env.SET_IN_REQUIRED).to.equal('1');
  });

  it('Imports import.env from mode.env', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({ SET_IN_IMPORT: z.string() }),
    });
    expect(_env.SET_IN_IMPORT).to.equal('1');
  });

  it('Imports local.import.env from mode.env', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({ SET_IN_LOCAL_IMPORT: z.string() }),
    });
    expect(_env.SET_IN_LOCAL_IMPORT).to.equal('1');
  });

  it('Imports deep.import.env from import.env from mode.env', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({ SET_IN_DEEP_IMPORT: z.string() }),
    });
    expect(_env.SET_IN_DEEP_IMPORT).to.equal('1');
  });

  it('Imports local.deep.import.env from import.env from mode.env', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({ SET_IN_LOCAL_DEEP_IMPORT: z.string() }),
    });
    expect(_env.SET_IN_LOCAL_DEEP_IMPORT).to.equal('1');
  });

  it('Mode change in import ignored', () => {
    process.env.MODE = 'mode2';
    const env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({ MODE: z.string() }),
    });
    expect(env.MODE).to.equal('mode2');
  });

  it('Required existing key', () => {
    setup({
      setup: true,
      basePath: 'src/test',
      required: ['SET_IN_ENV'],
      schema: z.object({ SET_IN_ENV: z.string() }),
    });
  });

  it('Required missing key', () => {
    try {
      setup({
        setup: true,
        basePath: 'src/test',
        required: ['MISSING'],
        schema: z.object({ SET_IN_ENV: z.string() }),
      });
      expect.fail('Expected error to be thrown');
    } catch (error: any) {
      expect(error.message).to.equal('Missing required environment variable: MISSING');
    }
  });

  it('Default missing key', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({
        MISSING: z.string().default('default'),
      }),
    });
    expect(_env.MISSING).to.equal('default');
  });

  it('Default existing key', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({
        SET_IN_ENV: z.string().default('default'),
      }),
    });
    expect(_env.SET_IN_ENV).to.equal('1');
  });

  it('Mapping existing key', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({
        SET_IN_ENV: z.coerce.number(),
      }),
    });
    expect(_env.SET_IN_ENV).to.equal(1);
  });

  it('Mapping missing key with Default', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({
        MISSING: z.coerce.number().default(2),
      }),
    });
    expect(_env.MISSING).to.equal(2);
  });

  it('Advanced required correct and inside or', () => {
    setup({
      setup: true,
      basePath: 'src/test',
      required: ['REQUIRED_1', {
        or: [
          { and: [{ key: 'REQUIRED_1', value: '2' }, 'REQUIRED_2'] },
          { and: [{ key: 'REQUIRED_3', value: '3' }, 'REQUIRED_2'] },
        ]
      }],
      schema: z.object({ REQUIRED_1: z.string(), REQUIRED_2: z.string(), REQUIRED_3: z.string() }),
    });
  });

  it('Advanced required incorrect and inside or', () => {
    try {
      setup({
        setup: true,
        basePath: 'src/test',
        required: ['REQUIRED_1', {
          or: [
            { and: [{ key: 'REQUIRED_3', value: '2' }, 'REQUIRED_4'] },
            { and: [{ key: 'REQUIRED_3', value: '3' }, 'REQUIRED_4'] },
          ]
        }],
        schema: z.object({ REQUIRED_1: z.string(), REQUIRED_2: z.string(), REQUIRED_3: z.string() }),
      });
      expect.fail('Expected error to be thrown');
    } catch (error: any) {
      expect(error.message).to.equal('Missing required environment variable: [REQUIRED_3=2, REQUIRED_4]');
    }
  });

  it('Advanced required incorrect or', () => {
    try {
      setup({
        setup: true,
        basePath: 'src/test',
        required: ['REQUIRED_1', {
          or: [
            { and: [{ key: 'REQUIRED_3', value: '1' }, 'REQUIRED_4'] },
            { and: [{ key: 'REQUIRED_3', value: '2' }, 'REQUIRED_4'] },
          ]
        }],
        schema: z.object({ REQUIRED_1: z.string(), REQUIRED_3: z.string().optional(), REQUIRED_4: z.string().optional() }),
      });
      expect.fail('Expected error to be thrown');
    } catch (error: any) {
      expect(error.message).to.equal('Missing required environment variable: [REQUIRED_3=1, REQUIRED_3=2]');
    }
  });

  it('Adds items from process.env', () => {
    process.env.SET_IN_PROCESS_ENV = '1';
    const _env = setup({
      setup: true,
      schema: z.object({ SET_IN_PROCESS_ENV: z.string() }),
    });
    expect(_env.SET_IN_PROCESS_ENV).to.equal('1');
  });

  it('Default MODE', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
      schema: z.object({ MODE: z.string().default('test') }),
    });
    expect(_env.MODE).to.equal('test');
  });
});
