import { test } from 'vitest';
import type { Infer } from './index.js';
import { scope } from './index.js';

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

test("container instantiation processses doen't evaluate a passed another container dependency instances", ({
  expect,
}) => {
  const container1 = scope()
    .provide({
      dep: () => {
        throw new Error('this code should never be called');
      },
    })
    .instanciate({});

  expect(() => {
    scope().static(container1).instanciate({});
  }).not.toThrowError();
});
