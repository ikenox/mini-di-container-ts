import { expect, test } from 'vitest';
import type { Infer } from './index';
import { scope } from './index';

// =============================================
// 1. Define containers
// =============================================

interface Logger {
  log(message: string): void;
}
type GreetingConfig = {
  greetingWord: 'Hello' | 'Hi';
};
class GreetingService {
  constructor(readonly config: GreetingConfig) {}
  greet(name: string): string {
    return `${this.config.greetingWord}, ${name}.`;
  }
}
class TalkingService {
  constructor(
    readonly greetingService: GreetingService,
    readonly fromName: string
  ) {}
  talkTo(toName: string): string {
    return `${this.fromName} said: ${this.greetingService.greet(toName)}`;
  }
}

// `scope()` defines a new container scope, here example is a singleton-scoped.
// `provide(...)` defines builder methods of dependencies.
const singletonScope = scope()
  .provide({
    logger: (): Logger => ({
      log: console.log,
    }),
    config: (): GreetingConfig => ({ greetingWord: 'Hello' }),
  })
  .provide({
    // You can use already defined dependencies to build another dependencies.
    greetingService: ({ config }): GreetingService =>
      new GreetingService(config),
  });
// Instanciate singleton-scoped container.
// Its contained dependencies are NOT instanciated yet, and it will be instanciated when actually used.
const singletonContainer = singletonScope.instanciate({});

// Define another-scoped container scope (as an example, here is a request-scoped).
// * It's recommended to create the scope instance as singleton regardless of its scope.
// * You can specify scope-specific external parameter (example here is `{ request: Request }`).
// * `static(...)` method allows this container to provide other-scoped container's dependency instances.
//   Then the merged container keeps original scope. It means that the instances managed by the singletonContainer are still singleton.
const requestScope = scope<{ request: Request }>()
  .static(singletonContainer)
  .provide({
    // Define request-scoped dependencies.
    // You can use the scope-specific external parameter to build dependencies.
    talkingService: ({ greetingService }, { request }) =>
      new TalkingService(
        greetingService,
        request.headers.get('x-greeter-name') ?? 'anonymous'
      ),
  });

// Request-scoped container is not instanciated yet, because it is instanciated per a request.

// =============================================
// 2. Use of the defined containers
// =============================================

// Your request handler as an example.
// Here assuming the request header contains `X-Greeter-Name: Alice`.
function requestHandler(request: Request) {
  // Instanciate request-scoped container per request, with the scope-specific external parameter.
  const requestScopedContainer = requestScope.instanciate({
    request,
  });

  // Of course, you can use each dependency instances directly.
  const { logger, config, talkingService } = requestScopedContainer;
  logger.log(config.greetingWord); // => 'Hello'
  logger.log(talkingService.talkTo('Bob')); // => 'Alice said: Hello, Bob.'

  // Anothor usage is passing the container itself to a downstream method.
  // This pattern is useful e.g. when the middreware method can't know which dependencies will be used in the downstream.
  logger.log(doGreeting('Carol', requestScopedContainer)); // => 'Alice said: Hello, Carol.'
}

type Dependencies = Infer<typeof requestScope>;
function doGreeting(
  toName: string,
  { logger, greetingService }: Dependencies
): string {
  logger.log('doGreeting is called');
  return greetingService.greet(toName);
}

// =============================================
// Tests
// =============================================
test('example', () => {
  const request = {
    headers: { get: () => 'Alice' },
  } as unknown as Request;

  requestHandler(request);

  // let messages: string[] = [];
  // requestScope.provide({
  //   logger: (): Logger => ({
  //     log: (msg) => (messages = [...messages, msg]),
  //   }),
  // });
  // requestHandler(request);
  // expect(messages).toEqual(['']);
});
