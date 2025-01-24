// @vitest-environment happy-dom

import { AgentSecret } from "cojson";
import { AuthSecretStorage } from "jazz-browser";
import { Account, ID } from "jazz-tools";
import { createJazzTestAccount } from "jazz-tools/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserClerkAuth } from "../index";
import type { MinimalClerkClient } from "../types";

describe("BrowserClerkAuth", () => {
  const mockAuthenticate = vi.fn();
  let auth: BrowserClerkAuth;

  beforeEach(async () => {
    AuthSecretStorage.clear();
    mockAuthenticate.mockReset();
    await createJazzTestAccount({
      isCurrentActiveAccount: true,
    });
    auth = new BrowserClerkAuth(mockAuthenticate);
  });

  describe("onClerkUserChange", () => {
    it("should do nothing if no clerk user", async () => {
      const mockClerk = {
        user: null,
      } as MinimalClerkClient;

      await auth.onClerkUserChange(mockClerk);
      expect(mockAuthenticate).not.toHaveBeenCalled();
    });

    it("should throw if not authenticated locally", async () => {
      const mockClerk = {
        user: {
          unsafeMetadata: {},
        },
        signOut: vi.fn(),
      } as unknown as MinimalClerkClient;

      await expect(auth.onClerkUserChange(mockClerk)).rejects.toThrow();
      expect(mockAuthenticate).not.toHaveBeenCalled();
      expect(mockClerk.signOut).not.toHaveBeenCalled();
    });

    it("should call signIn for new users", async () => {
      // Set up local auth
      AuthSecretStorage.set({
        accountID: "test123" as ID<Account>,
        secretSeed: new Uint8Array([1, 2, 3]),
        accountSecret: "secret123" as AgentSecret,
        provider: "anonymous",
      });

      const mockClerk = {
        user: {
          fullName: "Guido",
          unsafeMetadata: {},
          update: vi.fn(),
        },
        signOut: vi.fn(),
      } as unknown as MinimalClerkClient;

      await auth.onClerkUserChange(mockClerk);

      expect(mockClerk.user?.update).toHaveBeenCalledWith({
        unsafeMetadata: {
          jazzAccountID: "test123",
          jazzAccountSecret: "secret123",
          jazzAccountSeed: [1, 2, 3],
        },
      });
      expect(mockClerk.signOut).toHaveBeenCalled();
      expect(AuthSecretStorage.get()).toEqual({
        accountID: "test123",
        accountSecret: "secret123",
        secretSeed: new Uint8Array([1, 2, 3]),
        provider: "clerk",
      });

      const me = await Account.getMe().ensureLoaded({
        profile: {},
      });
      expect(me?.profile.name).toBe("Guido");
    });

    it("should call logIn for existing users", async () => {
      // Set up local auth
      AuthSecretStorage.set({
        accountID: "xxxx" as ID<Account>,
        secretSeed: new Uint8Array([2, 2, 2]),
        accountSecret: "xxxx" as AgentSecret,
        provider: "anonymous",
      });

      const mockClerk = {
        user: {
          fullName: "Guido",
          unsafeMetadata: {
            jazzAccountID: "test123",
            jazzAccountSecret: "secret123",
            jazzAccountSeed: [1, 2, 3],
          },
        },
        signOut: vi.fn(),
      } as unknown as MinimalClerkClient;

      await auth.onClerkUserChange(mockClerk);

      expect(mockAuthenticate).toHaveBeenCalledWith({
        accountID: "test123",
        accountSecret: "secret123",
        secretSeed: new Uint8Array([1, 2, 3]),
        provider: "clerk",
      });
      expect(mockClerk.signOut).toHaveBeenCalled();
    });
  });
});
