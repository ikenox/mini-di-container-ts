import { test } from 'vitest';
import type { Infer } from './index';
import { scope } from './index';

// Your types, classes and interfaces to be managed with DI container
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

// Defines a new container scope, here example is a singleton-scoped.
const singletonScope = scope()
  .provide({
    // builder methods of dependencies.
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
const singletonContainer = singletonScope.instanciate({});

// Define another scope. You can specify scope-specific parameter. As an example,
// here is `{ request: Request }`.
const requestScope = scope<{ request: Request }>()
  .static(singletonContainer)
  .provide({
    // Define request-scoped dependencies.
    talkingService: ({ greetingService }, { request }) =>
      new TalkingService(
        greetingService,
        request.headers.get('x-greeter-name') ?? 'anonymous'
      ),
  });

// The request-scoped container is not instanciated yet, since it is instanciated
// per a request.

// Your request handler as an example.
// Here assuming the request header contains `X-Greeter-Name: Alice`.
function requestHandler(request: Request) {
  // Instanciate the request-scoped container per request, with the scope-specific
  // external parameters.
  const requestScopedContainer = requestScope.instanciate({
    request,
  });

  // Of course, you can use each dependency instances directly.
  const { logger, config, talkingService } = requestScopedContainer;
  logger.log(config.greetingWord); // => 'Hello'
  logger.log(talkingService.talkTo('Bob')); // => 'Alice said: Hello, Bob.'

  // Another usage is passing the container itself to a downstream method.
  // This pattern is useful e.g. when the middreware method can't know which
  // dependencies will be used in the downstream.
  logger.log(doGreeting('Carol', requestScopedContainer));
  // => 'Alice said: Hello, Carol.'
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
});
