import { accountOrAgentIDfromSessionID } from "./coValue.js";
import { createdNowUnique } from "./crypto.js";
import { LocalNode } from "./node.js";
import { randomAnonymousAccountAndSessionID } from "./testUtils.js";

test("Empty COJSON Map works", () => {
    const node = new LocalNode(...randomAnonymousAccountAndSessionID());

    const coValue = node.createCoValue({
        type: "comap",
        ruleset: { type: "unsafeAllowAll" },
        meta: null,
        ...createdNowUnique(),
    });

    const content = coValue.getCurrentContent();

    if (content.type !== "comap") {
        throw new Error("Expected map");
    }

    expect(content.type).toEqual("comap");
    expect([...content.keys()]).toEqual([]);
    expect(content.toJSON()).toEqual({});
});

test("Can insert and delete Map entries in edit()", () => {
    const node = new LocalNode(...randomAnonymousAccountAndSessionID());

    const coValue = node.createCoValue({
        type: "comap",
        ruleset: { type: "unsafeAllowAll" },
        meta: null,
        ...createdNowUnique(),
    });

    const content = coValue.getCurrentContent();

    if (content.type !== "comap") {
        throw new Error("Expected map");
    }

    expect(content.type).toEqual("comap");

    content.edit((editable) => {
        editable.set("hello", "world", "trusting");
        expect(editable.get("hello")).toEqual("world");
        editable.set("foo", "bar", "trusting");
        expect(editable.get("foo")).toEqual("bar");
        expect([...editable.keys()]).toEqual(["hello", "foo"]);
        editable.delete("foo", "trusting");
        expect(editable.get("foo")).toEqual(undefined);
    });
});

test("Can get map entry values at different points in time", () => {
    const node = new LocalNode(...randomAnonymousAccountAndSessionID());

    const coValue = node.createCoValue({
        type: "comap",
        ruleset: { type: "unsafeAllowAll" },
        meta: null,
        ...createdNowUnique(),
    });

    const content = coValue.getCurrentContent();

    if (content.type !== "comap") {
        throw new Error("Expected map");
    }

    expect(content.type).toEqual("comap");

    content.edit((editable) => {
        const beforeA = Date.now();
        while (Date.now() < beforeA + 10) {}
        editable.set("hello", "A", "trusting");
        const beforeB = Date.now();
        while (Date.now() < beforeB + 10) {}
        editable.set("hello", "B", "trusting");
        const beforeC = Date.now();
        while (Date.now() < beforeC + 10) {}
        editable.set("hello", "C", "trusting");
        expect(editable.get("hello")).toEqual("C");
        expect(editable.getAtTime("hello", Date.now())).toEqual("C");
        expect(editable.getAtTime("hello", beforeA)).toEqual(undefined);
        expect(editable.getAtTime("hello", beforeB)).toEqual("A");
        expect(editable.getAtTime("hello", beforeC)).toEqual("B");
    });
});

test("Can get all historic values of key", () => {
    const node = new LocalNode(...randomAnonymousAccountAndSessionID());

    const coValue = node.createCoValue({
        type: "comap",
        ruleset: { type: "unsafeAllowAll" },
        meta: null,
        ...createdNowUnique(),
    });

    const content = coValue.getCurrentContent();

    if (content.type !== "comap") {
        throw new Error("Expected map");
    }

    expect(content.type).toEqual("comap");

    content.edit((editable) => {
        editable.set("hello", "A", "trusting");
        const txA = editable.getLastTxID("hello");
        editable.set("hello", "B", "trusting");
        const txB = editable.getLastTxID("hello");
        editable.delete("hello", "trusting");
        const txDel = editable.getLastTxID("hello");
        editable.set("hello", "C", "trusting");
        const txC = editable.getLastTxID("hello");
        expect(editable.getHistory("hello")).toEqual([
            {
                txID: txA,
                value: "A",
                at: txA && coValue.getTx(txA)?.madeAt,
            },
            {
                txID: txB,
                value: "B",
                at: txB && coValue.getTx(txB)?.madeAt,
            },
            {
                txID: txDel,
                value: undefined,
                at: txDel && coValue.getTx(txDel)?.madeAt,
            },
            {
                txID: txC,
                value: "C",
                at: txC && coValue.getTx(txC)?.madeAt,
            },
        ]);
    });
});

test("Can get last tx ID for a key", () => {
    const node = new LocalNode(...randomAnonymousAccountAndSessionID());

    const coValue = node.createCoValue({
        type: "comap",
        ruleset: { type: "unsafeAllowAll" },
        meta: null,
        ...createdNowUnique(),
    });

    const content = coValue.getCurrentContent();

    if (content.type !== "comap") {
        throw new Error("Expected map");
    }

    expect(content.type).toEqual("comap");

    content.edit((editable) => {
        expect(editable.getLastTxID("hello")).toEqual(undefined);
        editable.set("hello", "A", "trusting");
        const sessionID = editable.getLastTxID("hello")?.sessionID;
        expect(sessionID && accountOrAgentIDfromSessionID(sessionID)).toEqual(
            node.account.id
        );
        expect(editable.getLastTxID("hello")?.txIndex).toEqual(0);
        editable.set("hello", "B", "trusting");
        expect(editable.getLastTxID("hello")?.txIndex).toEqual(1);
        editable.set("hello", "C", "trusting");
        expect(editable.getLastTxID("hello")?.txIndex).toEqual(2);
    });
});