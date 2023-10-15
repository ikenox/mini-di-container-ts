// TODO: prevent duplicate key that value's type is not match to existing one
export class ContainerScope<
  Instances extends Record<string, unknown>,
  ScopeArgs,
> {
  constructor(readonly providers: Providers<Instances, Instances, ScopeArgs>) {}

  /**
   * Instanciates a container that provides dependency instances.
   * Actually, each dependency instances are NOT instanciated yet at this point.
   * It will be instanciated when actually used.
   */
  instanciate(params: ScopeArgs): Instances {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providers: Record<string | symbol, any> = this.providers;
    const caches: Record<string | symbol, unknown> = {};

    return new Proxy<Instances>({} as Instances, {
      ownKeys: () => Reflect.ownKeys(providers),
      getOwnPropertyDescriptor: function (target, key) {
        return {
          enumerable: true,
          configurable: true,
          // eslint-disable-next-line
          value: (this as any)[key],
        };
      },
      get(target, p, receiver) {
        // eslint-disable-next-line
        return (caches[p] ??= providers[p]?.(receiver, params));
      },
    });
  }

  /**
   * Merges external static instances to provide via the container.
   */
  static<P extends Record<string, unknown> & WithoutReserved<Instances>>(
    p: P
  ): ContainerScope<Instances & P, ScopeArgs> {
    const added = Object.fromEntries(
      // Don't use `Object.entries` because it causes immediate evaluation of the passed DI container's all members
      Object.keys(p).map((k) => [k, () => p[k]])
    ) as unknown as Providers<P, Instances, ScopeArgs>;
    const merged = {
      ...this.providers,
      ...added,
    } as Providers<P & Instances, Instances, ScopeArgs>; // TODO: type safety
    return new ContainerScope(merged);
  }

  /**
   * Add providers of dependencies.
   * The provider can use the other dependencies already provided to build the providing instance.
   */
  provide<
    P extends Providers<
      Record<string, unknown> & WithoutReserved<Instances>,
      Instances,
      ScopeArgs
    >,
  >(addedProviders: P): ContainerScope<Instances & ProvidedBy<P>, ScopeArgs> {
    const merged = {
      ...this.providers,
      ...addedProviders,
    } as unknown as Providers<Instances & ProvidedBy<P>, Instances, ScopeArgs>; // TODO: type safety
    return new ContainerScope(merged);
  }
}

type WithoutReserved<Instances> = Partial<Record<keyof Instances, never>>;

/**
 * A set of providers.
 */
export type Providers<Instances, Dependencies, ExtParams> = {
  [K in keyof Instances]: Provider<Dependencies, ExtParams, Instances[K]>;
};

/**
 * A builder method of a dependency instance.
 */
export type Provider<Dependencies, ExtParams, T> = (
  instances: Dependencies,
  extParams: ExtParams
) => T;

/**
 * Infer the type of dependecy instance of the specified provider.
 */
export type ProvidedBy<P extends Providers<unknown, unknown, unknown>> =
  P extends Providers<infer T, never, never> ? T : never;

/**
 * Infer the type of container instance of the specified container scope.
 */
export type Infer<C extends ContainerScope<Record<never, never>, never>> =
  C extends ContainerScope<infer A, never> ? A : never;

/**
 * Define a new container scope.
 * Container scope is like a template, or a builder of the specific container instance.
 * It's preferable that each container scopes are defined at only once and reused throughout the process.
 */
export function scope<ScopeArgs>(): ContainerScope<
  Record<never, never>,
  ScopeArgs
> {
  return new ContainerScope({});
}
