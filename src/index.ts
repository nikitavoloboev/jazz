import { CoValue, newRandomSessionID } from "./coValue.js";
import { LocalNode } from "./node.js";
import { CoMap } from "./contentTypes/coMap.js";
import { agentSecretFromBytes, agentSecretToBytes } from "./crypto.js";

import type { SessionID } from "./ids.js";
import type { CoValueID, ContentType } from "./contentType.js";
import type { JsonValue } from "./jsonValue.js";
import type { SyncMessage } from "./sync.js";
import type { AgentSecret } from "./crypto.js";

type Value = JsonValue | ContentType;

const internals = {
    agentSecretFromBytes,
    agentSecretToBytes,
    newRandomSessionID,
};

export { LocalNode, CoValue, CoMap, internals };

export type {
    Value,
    JsonValue,
    ContentType,
    CoValueID,
    AgentSecret,
    SessionID,
    SyncMessage,
};
