[![npm version](https://badge.fury.io/js/mini-di-container.svg)](https://badge.fury.io/js/mini-di-container)
[![CI](https://github.com/ikenox/mini-di-container-ts/actions/workflows/ci.yaml/badge.svg)](https://github.com/ikenox/mini-di-container-ts/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# mini-di-container

A minimum, type-safe and straightforward dependency injection container for TypeScript.

```shell
npm install mini-di-container
```

## Philosophy

- **Typesafe:** This package provides fully typed interfaces. If there are no compilation errors, then your code runs as you expected.
- **No annotation:** This package is NOT annotation-based DI library.
- **Simple:** Few public interfaces and parameters. When you read the small example code below, you will know everything about this library.
- **Plain:** Few implicit rules and no proprietary syntax. If you can read TypeScript, then you can use this library intuitively.

## Key features

- **Instance management:** Dependency instances are instanciated and cached per container.
- **Lazy evaluation:** Processes are lazy as much as possible. Each dependency instances are not instantiated until it is actually used.
- **Scope management:** You can easily achieve singleton scoped, request scoped or any scoped contaniner you want. You can also use external parameters (e.g. request object) to build your dependencies.

## Usage

```typescript
import { type Infer, scope } from 'mini-di-container';

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
  // Provide other-scoped dependencies in this scope together
  // Note that the merged singleton-scoped dependencies are still singleton
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
```

## License

MIT
