import test from "node:test";
import assert from "node:assert/strict";

import { shouldQueueRealtimeUpdateFromInput } from "../../src/plugin/realtime_input";

test("returns true when input target is inside heading node", () => {
    const shouldQueue = shouldQueueRealtimeUpdateFromInput({
        isHeadingNode: true,
        textContent: "普通文本",
    });
    assert.equal(shouldQueue, true);
});

test("returns true when text contains markdown heading syntax", () => {
    const shouldQueue = shouldQueueRealtimeUpdateFromInput({
        isHeadingNode: false,
        textContent: "# 一级标题1",
    });
    assert.equal(shouldQueue, true);
});

test("returns true for incomplete markdown heading input", () => {
    const shouldQueue = shouldQueueRealtimeUpdateFromInput({
        isHeadingNode: false,
        textContent: "# ",
    });
    assert.equal(shouldQueue, true);
});

test("returns false for regular paragraph input", () => {
    const shouldQueue = shouldQueueRealtimeUpdateFromInput({
        isHeadingNode: false,
        textContent: "这是一段普通文本",
    });
    assert.equal(shouldQueue, false);
});
