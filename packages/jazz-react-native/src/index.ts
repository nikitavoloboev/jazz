/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    CoValue,
    ID,
    AgentID,
    SessionID,
    cojsonInternals,
    InviteSecret,
    Account,
    CoValueClass,
    CryptoProvider,
    AuthMethod,
    createJazzContext,
    AnonymousJazzAgent,
} from "jazz-tools";

import { PureJSCrypto } from "jazz-tools/native";
import { RawAccountID } from "cojson";
import { createWebSocketPeer } from "cojson-transport-ws";
import { MMKV } from "react-native-mmkv";
// import NetInfo from "@react-native-community/netinfo";

export { RNDemoAuth } from "./auth/DemoAuthMethod.js";

const storage = new MMKV();

/** @category Context Creation */
export type BrowserContext<Acc extends Account> = {
    me: Acc;
    logOut: () => void;
    // TODO: Symbol.dispose?
    done: () => void;
};

export type BrowserGuestContext = {
    guest: AnonymousJazzAgent;
    logOut: () => void;
    done: () => void;
};

export type BrowserContextOptions<Acc extends Account> = {
    auth: AuthMethod;
    AccountSchema: CoValueClass<Acc> & {
        fromNode: (typeof Account)["fromNode"];
    };
} & BaseBrowserContextOptions;

export type BaseBrowserContextOptions = {
    peer: `wss://${string}` | `ws://${string}`;
    reconnectionTimeout?: number;
    storage?: "indexedDB" | "singleTabOPFS";
    crypto?: CryptoProvider;
};

/** @category Context Creation */
export async function createJazzRNContext<Acc extends Account>(
    options: BrowserContextOptions<Acc>,
): Promise<BrowserContext<Acc>>;
export async function createJazzRNContext(
    options: BaseBrowserContextOptions,
): Promise<BrowserGuestContext>;
export async function createJazzRNContext<Acc extends Account>(
    options: BrowserContextOptions<Acc> | BaseBrowserContextOptions,
): Promise<BrowserContext<Acc> | BrowserGuestContext>;
export async function createJazzRNContext<Acc extends Account>(
    options: BrowserContextOptions<Acc> | BaseBrowserContextOptions,
): Promise<BrowserContext<Acc> | BrowserGuestContext> {
    const firstWsPeer = createWebSocketPeer({
        websocket: new WebSocket(options.peer),
        id: options.peer + "@" + new Date().toISOString(),
        role: "server",
        expectPings: true,
    });
    let shouldTryToReconnect = true;

    let currentReconnectionTimeout = options.reconnectionTimeout || 500;

    // const unsubscribeNetworkChange = NetInfo.addEventListener((state) => {
    //     if (state.isConnected) {
    //         currentReconnectionTimeout = options.reconnectionTimeout || 500;
    //     }
    // });

    const context =
        "auth" in options
            ? await createJazzContext({
                  AccountSchema: options.AccountSchema,
                  auth: options.auth,
                  crypto: await PureJSCrypto.create(),
                  peersToLoadFrom: [firstWsPeer],
                  sessionProvider: provideBroswerLockSession,
              })
            : await createJazzContext({
                  crypto: await PureJSCrypto.create(),
                  peersToLoadFrom: [firstWsPeer],
              });

    const node =
        "account" in context
            ? context.account._raw.core.node
            : context.agent.node;

    async function websocketReconnectLoop() {
        while (shouldTryToReconnect) {
            if (
                Object.keys(node.syncManager.peers).some((peerId) =>
                    peerId.includes(options.peer),
                )
            ) {
                // TODO: this might drain battery, use listeners instead
                await new Promise((resolve) => setTimeout(resolve, 100));
            } else {
                console.log(
                    "Websocket disconnected, trying to reconnect in " +
                        currentReconnectionTimeout +
                        "ms",
                );
                currentReconnectionTimeout = Math.min(
                    currentReconnectionTimeout * 2,
                    30000,
                );
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, currentReconnectionTimeout);
                    resolve();
                    // const _unsubscribeNetworkChange = NetInfo.addEventListener(
                    //     (state) => {
                    //         if (state.isConnected) {
                    //             resolve();
                    //             _unsubscribeNetworkChange();
                    //         }
                    //     },
                    // );
                });

                node.syncManager.addPeer(
                    createWebSocketPeer({
                        websocket: new WebSocket(options.peer),
                        id: options.peer + "@" + new Date().toISOString(),
                        role: "server",
                    }),
                );
            }
        }
    }

    void websocketReconnectLoop();

    return "account" in context
        ? {
              me: context.account,
              done: () => {
                  shouldTryToReconnect = false;
                  //   unsubscribeNetworkChange?.();
                  context.done();
              },
              logOut: () => {
                  context.logOut();
              },
          }
        : {
              guest: context.agent,
              done: () => {
                  shouldTryToReconnect = false;
                  //   unsubscribeNetworkChange?.();
                  context.done();
              },
              logOut: () => {
                  context.logOut();
              },
          };
}

/** @category Auth Providers */
export type SessionProvider = (
    accountID: ID<Account> | AgentID,
) => Promise<SessionID>;

export function provideBroswerLockSession(
    accountID: ID<Account> | AgentID,
    crypto: CryptoProvider,
) {
    const sessionDone = () => {};

    const sessionID =
        (storage.getString(accountID) as SessionID) ||
        crypto.newRandomSessionID(accountID as RawAccountID | AgentID);
    storage.set(accountID, sessionID);

    return Promise.resolve({
        sessionID,
        sessionDone,
    });
}

const window = {
    location: {
        href: "#",
    },
    history: {
        replaceState: (a: any, b: any, c: any) => {},
    },
};

/** @category Invite Links */
export function createInviteLink<C extends CoValue>(
    value: C,
    role: "reader" | "writer" | "admin",
    // default to same address as window.location, but without hash
    {
        baseURL = window.location.href.replace(/#.*$/, ""),
        valueHint,
    }: { baseURL?: string; valueHint?: string } = {},
): string {
    const coValueCore = value._raw.core;
    let currentCoValue = coValueCore;

    while (currentCoValue.header.ruleset.type === "ownedByGroup") {
        currentCoValue = currentCoValue.getGroup().core;
    }

    if (currentCoValue.header.ruleset.type !== "group") {
        throw new Error("Can't create invite link for object without group");
    }

    const group = cojsonInternals.expectGroup(
        currentCoValue.getCurrentContent(),
    );
    const inviteSecret = group.createInvite(role);

    return `${baseURL}#/invite/${valueHint ? valueHint + "/" : ""}${
        value.id
    }/${inviteSecret}`;
}

/** @category Invite Links */
export function parseInviteLink<C extends CoValue>(
    inviteURL: string,
):
    | {
          valueID: ID<C>;
          valueHint?: string;
          inviteSecret: InviteSecret;
      }
    | undefined {
    const url = new URL(inviteURL);
    const parts = url.hash.split("/");

    let valueHint: string | undefined;
    let valueID: ID<C> | undefined;
    let inviteSecret: InviteSecret | undefined;

    if (parts[0] === "#" && parts[1] === "invite") {
        if (parts.length === 5) {
            valueHint = parts[2];
            valueID = parts[3] as ID<C>;
            inviteSecret = parts[4] as InviteSecret;
        } else if (parts.length === 4) {
            valueID = parts[2] as ID<C>;
            inviteSecret = parts[3] as InviteSecret;
        }

        if (!valueID || !inviteSecret) {
            return undefined;
        }
        return { valueID, inviteSecret, valueHint };
    }
}

/** @category Invite Links */
export function consumeInviteLinkFromWindowLocation<V extends CoValue>({
    as,
    forValueHint,
    invitedObjectSchema,
}: {
    as: Account;
    forValueHint?: string;
    invitedObjectSchema: CoValueClass<V>;
}): Promise<
    | {
          valueID: ID<V>;
          valueHint?: string;
          inviteSecret: InviteSecret;
      }
    | undefined
> {
    return new Promise((resolve, reject) => {
        const result = parseInviteLink<V>(window.location.href);

        if (result && result.valueHint === forValueHint) {
            as.acceptInvite(
                result.valueID,
                result.inviteSecret,
                invitedObjectSchema,
            )
                .then(() => {
                    resolve(result);
                    window.history.replaceState(
                        {},
                        "",
                        window.location.href.replace(/#.*$/, ""),
                    );
                })
                .catch(reject);
        } else {
            resolve(undefined);
        }
    });
}

/////////

export * from "./provider.js";
export * from "./auth/auth.js";
