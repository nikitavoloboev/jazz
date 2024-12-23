import {
  BaseBrowserContextOptions,
  BrowserContext,
  BrowserGuestContext,
  consumeInviteLinkFromWindowLocation,
  createJazzBrowserContext,
} from "jazz-browser";
import React, { useEffect, useRef, useState } from "react";

import {
  Account,
  AccountClass,
  AnonymousJazzAgent,
  AuthMethod,
  CoValue,
  CoValueClass,
  DeeplyLoaded,
  DepthsIn,
  ID,
  createCoValueObservable,
} from "jazz-tools";

/** @category Context & Hooks */
export function createJazzReactApp<Acc extends Account>({
  AccountSchema = Account as unknown as AccountClass<Acc>,
}: {
  AccountSchema?: AccountClass<Acc>;
} = {}): JazzReactApp<Acc> {
  const JazzContext = React.createContext<
    BrowserContext<Acc> | BrowserGuestContext | undefined
  >(undefined);

  function Provider({
    children,
    auth,
    peer,
    storage,
  }: {
    children: React.ReactNode;
    auth: AuthMethod | "guest";
    peer: `wss://${string}` | `ws://${string}`;
    storage?: BaseBrowserContextOptions["storage"];
  }) {
    const [ctx, setCtx] = useState<
      BrowserContext<Acc> | BrowserGuestContext | undefined
    >();

    const [sessionCount, setSessionCount] = useState(0);

    const effectExecuted = useRef(false);
    effectExecuted.current = false;

    useEffect(
      () => {
        // Avoid double execution of the effect in development mode for easier debugging.
        if (process.env.NODE_ENV === "development") {
          if (effectExecuted.current) {
            return;
          }
          effectExecuted.current = true;

          // In development mode we don't return a cleanup function because otherwise
          // the double effect execution would mark the context as done immediately.
          //
          // So we mark it as done in the subsequent execution.
          const previousContext = ctx;

          if (previousContext) {
            previousContext.done();
          }
        }

        async function createContext() {
          const currentContext = await createJazzBrowserContext<Acc>(
            auth === "guest"
              ? {
                  peer,
                  storage,
                }
              : {
                  AccountSchema,
                  auth,
                  peer,
                  storage,
                },
          );

          const logOut = () => {
            currentContext.logOut();
            setCtx(undefined);
            setSessionCount(sessionCount + 1);

            if (process.env.NODE_ENV === "development") {
              // In development mode we don't return a cleanup function
              // so we mark the context as done here.
              currentContext.done();
            }
          };

          setCtx({
            ...currentContext,
            logOut,
          });

          return currentContext;
        }

        const promise = createContext();

        // In development mode we don't return a cleanup function because otherwise
        // the double effect execution would mark the context as done immediately.
        if (process.env.NODE_ENV === "development") {
          return;
        }

        return () => {
          void promise.then((context) => context.done());
        };
      },
      [AccountSchema, auth, peer, sessionCount].concat(storage as any),
    );

    return (
      <JazzContext.Provider value={ctx}>{ctx && children}</JazzContext.Provider>
    );
  }

  function useAccount(): { me: Acc; logOut: () => void };
  function useAccount<D extends DepthsIn<Acc>>(
    depth: D,
  ): { me: DeeplyLoaded<Acc, D> | undefined; logOut: () => void };
  function useAccount<D extends DepthsIn<Acc>>(
    depth?: D,
  ): { me: Acc | DeeplyLoaded<Acc, D> | undefined; logOut: () => void } {
    const context = React.useContext(JazzContext);

    if (!context) {
      throw new Error("useAccount must be used within a JazzProvider");
    }

    if (!("me" in context)) {
      throw new Error(
        "useAccount can't be used in a JazzProvider with auth === 'guest' - consider using useAccountOrGuest()",
      );
    }

    const me = useCoState<Acc, D>(
      context?.me.constructor as CoValueClass<Acc>,
      context?.me.id,
      depth,
    );

    return {
      me: depth === undefined ? me || context.me : me,
      logOut: context.logOut,
    };
  }

  function useAccountOrGuest(): { me: Acc | AnonymousJazzAgent };
  function useAccountOrGuest<D extends DepthsIn<Acc>>(
    depth: D,
  ): { me: DeeplyLoaded<Acc, D> | undefined | AnonymousJazzAgent };
  function useAccountOrGuest<D extends DepthsIn<Acc>>(
    depth?: D,
  ): { me: Acc | DeeplyLoaded<Acc, D> | undefined | AnonymousJazzAgent } {
    const context = React.useContext(JazzContext);

    if (!context) {
      throw new Error("useAccountOrGuest must be used within a JazzProvider");
    }

    const contextMe = "me" in context ? context.me : undefined;

    const me = useCoState<Acc, D>(
      contextMe?.constructor as CoValueClass<Acc>,
      contextMe?.id,
      depth,
    );

    if ("me" in context) {
      return {
        me: depth === undefined ? me || context.me : me,
      };
    } else {
      return { me: context.guest };
    }
  }

  function useCoState<V extends CoValue, D>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Schema: CoValueClass<V>,
    id: ID<V> | undefined,
    depth: D & DepthsIn<V> = [] as D & DepthsIn<V>,
  ): DeeplyLoaded<V, D> | undefined {
    const context = React.useContext(JazzContext);

    if (!context) {
      throw new Error("useCoState must be used within a JazzProvider");
    }

    const [observable] = React.useState(() => createCoValueObservable());

    const value = React.useSyncExternalStore<DeeplyLoaded<V, D> | undefined>(
      React.useCallback(
        (callback) => {
          if (!id) return () => {};

          const agent = "me" in context ? context.me : context.guest;

          return observable.subscribe(Schema, id, agent, depth, callback);
        },
        [Schema, id, context],
      ),
      () => observable.getCurrentValue(),
      () => observable.getCurrentValue(),
    );

    return value;
  }

  function useAcceptInvite<V extends CoValue>({
    invitedObjectSchema,
    onAccept,
    forValueHint,
  }: {
    invitedObjectSchema: CoValueClass<V>;
    onAccept: (projectID: ID<V>) => void;
    forValueHint?: string;
  }): void {
    const context = React.useContext(JazzContext);

    if (!context) {
      throw new Error("useAcceptInvite must be used within a JazzProvider");
    }

    if (!("me" in context)) {
      throw new Error(
        "useAcceptInvite can't be used in a JazzProvider with auth === 'guest'.",
      );
    }

    useEffect(() => {
      const handleInvite = () => {
        const result = consumeInviteLinkFromWindowLocation({
          as: context.me,
          invitedObjectSchema,
          forValueHint,
        });

        result
          .then((result) => result && onAccept(result?.valueID))
          .catch((e) => {
            console.error("Failed to accept invite", e);
          });
      };

      handleInvite();

      window.addEventListener("hashchange", handleInvite);

      return () => window.removeEventListener("hashchange", handleInvite);
    }, [onAccept]);
  }

  return {
    Provider,
    useAccount,
    useAccountOrGuest,
    useCoState,
    useAcceptInvite,
  };
}

/** @category Context & Hooks */
export interface JazzReactApp<Acc extends Account> {
  /** @category Provider Component */
  Provider: React.FC<{
    children: React.ReactNode;
    auth: AuthMethod | "guest";
    peer: `wss://${string}` | `ws://${string}`;
    storage?: BaseBrowserContextOptions["storage"];
  }>;

  /** @category Hooks */
  useAccount(): {
    me: Acc;
    logOut: () => void;
  };
  /** @category Hooks */
  useAccount<D extends DepthsIn<Acc>>(
    depth: D,
  ): {
    me: DeeplyLoaded<Acc, D> | undefined;
    logOut: () => void;
  };

  /** @category Hooks */
  useAccountOrGuest(): {
    me: Acc | AnonymousJazzAgent;
  };
  useAccountOrGuest<D extends DepthsIn<Acc>>(
    depth: D,
  ): {
    me: DeeplyLoaded<Acc, D> | undefined | AnonymousJazzAgent;
  };
  /** @category Hooks */
  useCoState<V extends CoValue, D>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Schema: { new (...args: any[]): V } & CoValueClass,
    id: ID<V> | undefined,
    depth?: D & DepthsIn<V>,
  ): DeeplyLoaded<V, D> | undefined;

  /** @category Hooks */
  useAcceptInvite<V extends CoValue>({
    invitedObjectSchema,
    onAccept,
    forValueHint,
  }: {
    invitedObjectSchema: CoValueClass<V>;
    onAccept: (projectID: ID<V>) => void;
    forValueHint?: string;
  }): void;
}

export { createInviteLink, parseInviteLink } from "jazz-browser";

export * from "./auth/auth.js";
export * from "./media.js";
