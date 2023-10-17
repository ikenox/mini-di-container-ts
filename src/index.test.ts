import { describe, test } from 'vitest';
import type { Infer } from './index';
import { scope } from './index';

test('basic usage', ({ expect }) => {
  const scope1 = scope()
    .provide({
      depA: () => 'a',
      depB: () => 'b',
    })
    .provide({
      depABC: ({ depA, depB }) => `${depA}${depB}c`,
    });
  type Scope1 = Infer<typeof scope1>;

  const container1 = scope1.instanciate({});

  expect(container1.depA).toBe('a');
  expect(container1.depB).toBe('b');
  expect(container1.depABC).toBe('abc');
  expect(container1).toStrictEqual<Scope1>({
    depA: 'a',
    depB: 'b',
    depABC: 'abc',
  });

  const scope2 = scope<{
    param: number;
  }>()
    .provide({
      depD: () => 'd',
    })
    .static(container1)
    .provide({
      depE: ({ depABC, depD }, { param }) => `${depABC}-${depD}-${param}`,
    });

  const container2 = scope2.instanciate({
    param: 123,
  });
  const container3 = scope2.instanciate({
    param: 456,
  });

  expect(container2.depD).toBe('d');
  expect(container2.depE).toBe('abc-d-123');
  expect(container2).toStrictEqual<Infer<typeof scope2>>({
    depA: 'a',
    depB: 'b',
    depABC: 'abc',
    depD: 'd',
    depE: 'abc-d-123',
  });

  expect(container3.depD).toBe('d');
  expect(container3.depE).toBe('abc-d-456');
  expect(container3).toStrictEqual<Infer<typeof scope2>>({
    depA: 'a',
    depB: 'b',
    depABC: 'abc',
    depD: 'd',
    depE: 'abc-d-456',
  });

  // eslint-disable-next-line
  expect((container3 as any)['x']).toBeUndefined();
});

test('cache', ({ expect }) => {
  const scope1 = scope().provide({
    num: () => Math.random(),
  });
  const container1 = scope1.instanciate({});
  const container2 = scope1.instanciate({});

  expect(container1.num).toBe(container1.num);
  expect(container2.num).toBe(container2.num);
  expect(container1.num).not.toBe(container2.num);
});

describe('lazy evaluation', () => {
  const container = scope()
    .provide({
      depA: () => {
        throw new Error('this code should never be called');
      },
      depB: () => 123,
    })
    .instanciate({});

  test('dependencies are not evaluated when merged by `static` method', ({
    expect,
  }) => {
    expect(() => {
      scope().static(container).instanciate({});
    }).not.toThrowError();
  });

  test('unspecified variable is not evaluated on object destruction', ({
    expect,
  }) => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { depB } = container;
    }).not.toThrowError();
  });
});

describe('type-level tests', () => {
  const testScope = scope().provide({
    depA: () => 1,
  });

  test('`provide` function: cannot provide dependency that key already exists', () => {
    type Arg = Parameters<typeof testScope.provide>[0];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cannotOverwriteDepA: Eq<Arg['depA'], undefined> = true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const canAddOtherKey: Extends<Arg['testKey'], unknown> = true;
  });

  test('`static` function: cannot provide dependency that key already exists', () => {
    type Arg = Parameters<typeof testScope.static>[0];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cannotOverwriteDepA: Eq<Arg['depA'], undefined> = true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const canAddOtherKey: Extends<Arg['testKey'], unknown> = true;
  });
});

type Eq<A, B> = A extends B ? (B extends A ? true : false) : false;
type Extends<A, B> = A extends B ? true : false;
