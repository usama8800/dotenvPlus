import { expect } from "chai";
import { z } from "zod";
import { loadEnv as setup } from "../../src/index";

describe('Base', () => {
  beforeEach(() => {
    delete process.env.MODE;
  });

  it('Does not require .env', () => {
    setup({ setup: true });
  });

  it('Reads .env always', () => {
    process.env.MODE = 'test1';
    const _env = setup({
      setup: true,
      basePath: 'src/test',
    });
    expect(_env.SET_IN_ENV).to.equal('1');
  });

  it('Reads local.env always', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
    });
    expect(_env.SET_IN_LOCAL_ENV).to.equal('1');
  });

  it('Overrides .env.MODE with process.env.MODE', () => {
    process.env.MODE = 'required';
    const _env = setup({
      setup: true,
      basePath: 'src/test',
    });
    expect(_env.SET_IN_MODE).to.not.be.ok;
  });

  it('Moves from mode.env to local.mode.env', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
    });
    expect(_env.SET_IN_LOCAL_MODE).to.equal('1');
  });

  it('Moves from .env to mode.env to required.env', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
    });
    expect(_env.SET_IN_REQUIRED).to.equal('1');
  });

  it('Imports import.env from mode.env', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
    });
    expect(_env.SET_IN_IMPORT).to.equal('1');
  });

  it('Imports local.import.env from mode.env', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
    });
    expect(_env.SET_IN_LOCAL_IMPORT).to.equal('1');
  });

  it('Imports deep.import.env from import.env from mode.env', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
    });
    expect(_env.SET_IN_DEEP_IMPORT).to.equal('1');
  });

  it('Imports local.deep.import.env from import.env from mode.env', () => {
    const _env = setup({
      setup: true,
      basePath: 'src/test',
    });
    expect(_env.SET_IN_LOCAL_DEEP_IMPORT).to.equal('1');
  });

  it('Mode change in import ignored', () => {
    process.env.MODE = 'mode2';
    const env = setup({
      setup: true,
      basePath: 'src/test',
    });
    expect(env.MODE).to.equal('mode2');
  });

  it('Required existing key', () => {
    setup({
      setup: true,
      basePath: 'src/test',
      required: ['SET_IN_ENV'],
    });
  });

  it('Required missing key', () => {
    try {
      setup({
        setup: true,
        basePath: 'src/test',
        required: ['MISSING'],
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
      });
      expect.fail('Expected error to be thrown');
    } catch (error: any) {
      expect(error.message).to.equal('Missing required environment variable: [REQUIRED_3=1, REQUIRED_3=2]');
    }
  });
});
