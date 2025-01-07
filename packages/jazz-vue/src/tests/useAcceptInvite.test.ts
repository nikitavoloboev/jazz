// @vitest-environment happy-dom

import { CoMap, Group, ID, co } from "jazz-tools";
import { describe, expect, it } from "vitest";
import { createInviteLink, useAcceptInvite } from "../index.js";
import { createJazzTestAccount, linkAccounts } from "../testing.js";
import { waitFor, withJazzTestSetup } from "./testUtils.js";

describe("useAcceptInvite", () => {
  it("should accept the invite", async () => {
    class TestMap extends CoMap {
      value = co.string;
    }

    const account = await createJazzTestAccount();
    const inviteSender = await createJazzTestAccount();

    linkAccounts(account, inviteSender);

    let acceptedId: ID<TestMap> | undefined;

    const invitelink = createInviteLink(
      TestMap.create(
        { value: "hello" },
        { owner: Group.create({ owner: inviteSender }) },
      ),
      "reader",
    );

    location.href = invitelink;

    withJazzTestSetup(
      () =>
        useAcceptInvite({
          invitedObjectSchema: TestMap,
          onAccept: (id) => {
            acceptedId = id;
          },
        }),
      {
        account,
      },
    );

    await waitFor(() => {
      expect(acceptedId).toBeDefined();
    });

    const accepted = await TestMap.load(acceptedId!, account, {});

    expect(accepted?.value).toEqual("hello");
  });
});
