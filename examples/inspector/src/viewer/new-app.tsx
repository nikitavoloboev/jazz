import clsx from "clsx";
import {
  AgentSecret,
  CoID,
  LocalNode,
  RawAccount,
  RawAccountID,
  RawCoValue,
} from "cojson";
import { createWebSocketPeer } from "cojson-transport-ws";
import { WasmCrypto } from "cojson/crypto/WasmCrypto";
import { Trash2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Breadcrumbs } from "./breadcrumbs";
import { PageStack } from "./page-stack";
import { usePagePath } from "./use-page-path";
import { resolveCoValue, useResolvedCoValue } from "./use-resolve-covalue";

interface Account {
  id: CoID<RawAccount>;
  secret: AgentSecret;
}

export default function CoJsonViewerApp() {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const storedAccounts = localStorage.getItem("inspectorAccounts");
    return storedAccounts ? JSON.parse(storedAccounts) : [];
  });
  const [currentAccount, setCurrentAccount] = useState<Account | null>(() => {
    const lastSelectedId = localStorage.getItem("lastSelectedAccountId");
    if (lastSelectedId) {
      const lastAccount = accounts.find(
        (account) => account.id === lastSelectedId,
      );
      return lastAccount || null;
    }
    return null;
  });
  const [localNode, setLocalNode] = useState<LocalNode | null>(null);
  const [coValueId, setCoValueId] = useState<CoID<RawCoValue> | "">("");
  const { path, addPages, goToIndex, goBack, setPage } = usePagePath();

  useEffect(() => {
    localStorage.setItem("inspectorAccounts", JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (currentAccount) {
      localStorage.setItem("lastSelectedAccountId", currentAccount.id);
    } else {
      localStorage.removeItem("lastSelectedAccountId");
    }
  }, [currentAccount]);

  useEffect(() => {
    if (!currentAccount && path.length > 0) {
      setLocalNode(null);
      goToIndex(-1);
      return;
    }

    if (!currentAccount) return;

    WasmCrypto.create().then(async (crypto) => {
      const wsPeer = createWebSocketPeer({
        id: "cloud",
        websocket: new WebSocket("wss://cloud.jazz.tools"),
        role: "server",
      });
      const node = await LocalNode.withLoadedAccount({
        accountID: currentAccount.id,
        accountSecret: currentAccount.secret,
        sessionID: crypto.newRandomSessionID(currentAccount.id),
        peersToLoadFrom: [wsPeer],
        crypto,
        migration: async () => {
          console.log("Not running any migration in inspector");
        },
      });
      setLocalNode(node);
    });
  }, [currentAccount, goToIndex, path]);

  const addAccount = (id: RawAccountID, secret: AgentSecret) => {
    const newAccount = { id, secret };
    const accountExists = accounts.some((account) => account.id === id);
    if (!accountExists) {
      setAccounts([...accounts, newAccount]);
    }
    setCurrentAccount(newAccount);
  };

  const deleteCurrentAccount = () => {
    if (currentAccount) {
      const updatedAccounts = accounts.filter(
        (account) => account.id !== currentAccount.id,
      );
      setAccounts(updatedAccounts);
      setCurrentAccount(updatedAccounts.length > 0 ? updatedAccounts[0] : null);
    }
  };

  const handleCoValueIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (coValueId) {
      setPage(coValueId);
    }
    setCoValueId("");
  };

  if (
    path?.[0]?.coId.toString() === "import" &&
    path?.[1]?.coId !== undefined &&
    path?.[2]?.coId !== undefined
  ) {
    addAccount(
      path?.[1]?.coId as RawAccountID,
      atob(path?.[2]?.coId as string) as AgentSecret,
    );
    goToIndex(-1);
  }

  return (
    <div className="w-full h-screen bg-gray-100 p-4 overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4 gap-4">
        <div className="flex flex-1 w-full sm:w-auto items-center gap-4">
          <Breadcrumbs path={path} onBreadcrumbClick={goToIndex} />
          <div className="flex-1">
            <form onSubmit={handleCoValueIdSubmit}>
              {path.length !== 0 && (
                <input
                  className="border hover:border-gray-300 transition-colors p-2 rounded-xl sm:w-[10rem] lg:min-w-[25rem] font-mono"
                  placeholder="co_z1234567890abcdef123456789"
                  value={coValueId}
                  onChange={(e) =>
                    setCoValueId(e.target.value as CoID<RawCoValue>)
                  }
                />
              )}
            </form>
          </div>
        </div>
        <AccountSwitcher
          accounts={accounts}
          currentAccount={currentAccount}
          setCurrentAccount={setCurrentAccount}
          deleteCurrentAccount={deleteCurrentAccount}
          localNode={localNode}
          showIdOnLargeScreen={true}
        />
      </div>

      <PageStack
        path={path}
        node={localNode}
        goBack={goBack}
        addPages={addPages}
      >
        {!currentAccount ? (
          <AddAccountForm addAccount={addAccount} />
        ) : (
          <form
            onSubmit={handleCoValueIdSubmit}
            aria-hidden={path.length !== 0}
            className={clsx(
              "flex flex-col justify-center items-center gap-2 h-full w-full mb-20 ",
              "transition-all duration-150",
              path.length > 0
                ? "opacity-0 -translate-y-2 scale-95"
                : "opacity-100",
            )}
          >
            <fieldset className="flex flex-col gap-2 text-sm">
              <h2 className="text-3xl font-medium text-gray-950 text-center mb-4">
                Jazz CoValue Inspector
              </h2>
              <input
                className="border p-4 rounded-lg min-w-[21rem] font-mono"
                placeholder="co_z1234567890abcdef123456789"
                value={coValueId}
                onChange={(e) =>
                  setCoValueId(e.target.value as CoID<RawCoValue>)
                }
              />
              <button
                type="submit"
                className="bg-indigo-500 hover:bg-indigo-500/80 text-white px-4 py-2 rounded-md"
              >
                Inspect
              </button>
              <hr />
              <button
                type="button"
                className="border inline-block px-2 py-1.5 text-black rounded"
                onClick={() => {
                  setPage(currentAccount.id);
                }}
              >
                Inspect My Account
              </button>
            </fieldset>
          </form>
        )}
      </PageStack>
    </div>
  );
}

function AccountSwitcher({
  accounts,
  currentAccount,
  setCurrentAccount,
  deleteCurrentAccount,
  localNode,
  showIdOnLargeScreen,
}: {
  accounts: Account[];
  currentAccount: Account | null;
  setCurrentAccount: (account: Account | null) => void;
  deleteCurrentAccount: () => void;
  localNode: LocalNode | null;
  showIdOnLargeScreen?: boolean;
}) {
  return (
    <div className="relative flex items-center gap-1 w-full sm:w-auto">
      <select
        value={currentAccount?.id || "add-account"}
        onChange={(e) => {
          if (e.target.value === "add-account") {
            setCurrentAccount(null);
          } else {
            const account = accounts.find((a) => a.id === e.target.value);
            setCurrentAccount(account || null);
          }
        }}
        className="w-full sm:w-auto p-2 px-4 bg-gray-100/50 border border-indigo-500/10 backdrop-blur-sm rounded-xl text-indigo-700 font-mono appearance-none"
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {localNode ? (
              <AccountNameDisplay
                accountId={account.id}
                node={localNode}
                showId={showIdOnLargeScreen}
              />
            ) : (
              account.id
            )}
          </option>
        ))}
        <option value="add-account">Add account</option>
      </select>
      {currentAccount && (
        <button
          onClick={deleteCurrentAccount}
          className="p-3 rounded hover:bg-gray-200 transition-colors"
          title="Delete Account"
        >
          <Trash2 size={16} className="text-gray-500" />
        </button>
      )}
    </div>
  );
}

function AddAccountForm({
  addAccount,
}: {
  addAccount: (id: RawAccountID, secret: AgentSecret) => void;
}) {
  const [id, setId] = useState("");
  const [secret, setSecret] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAccount(id as RawAccountID, secret as AgentSecret);
    setId("");
    setSecret("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 max-w-md mx-auto h-full justify-center"
    >
      <h2 className="text-2xl font-medium text-gray-900 mb-3">
        Add an Account to Inspect
      </h2>
      <input
        className="border py-2 px-3 rounded-md"
        placeholder="Account ID"
        value={id}
        onChange={(e) => setId(e.target.value)}
      />
      <input
        type="password"
        className="border py-2 px-3 rounded-md"
        placeholder="Account Secret"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
      />
      <button
        type="submit"
        className="bg-indigo-500 text-white px-4 py-2 rounded-md"
      >
        Add Account
      </button>
    </form>
  );
}

function AccountNameDisplay({
  accountId,
  node,
  showId = true,
}: {
  accountId: CoID<RawAccount>;
  node: LocalNode;
  showId?: boolean;
}) {
  const { snapshot } = useResolvedCoValue(accountId, node);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (snapshot && typeof snapshot === "object" && "profile" in snapshot) {
      const profileId = snapshot.profile as CoID<RawCoValue>;
      resolveCoValue(profileId, node).then((profileResult) => {
        if (
          profileResult.snapshot &&
          typeof profileResult.snapshot === "object" &&
          "name" in profileResult.snapshot
        ) {
          setName(profileResult.snapshot.name as string);
        }
      });
    }
  }, [snapshot, node]);

  return name ? (showId ? `${name} <${accountId}>` : name) : accountId;
}
