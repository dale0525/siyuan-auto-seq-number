import test from "node:test";
import assert from "node:assert/strict";

import { resolveRealtimeUpdateDecision } from "../../src/plugin/realtime_trigger";

test("queues update when heading operation arrives as update action", () => {
    const result = resolveRealtimeUpdateDecision(
        {
            action: "update",
            data: '<div data-subtype="h1"># 一级标题1</div>',
        },
        false
    );

    assert.equal(result.nextShouldUpdate, true);
    assert.equal(result.shouldQueue, true);
});

test("queues update when operation contains markdown heading syntax", () => {
    const result = resolveRealtimeUpdateDecision(
        {
            action: "update",
            data: "# 一级标题1",
        },
        false
    );

    assert.equal(result.nextShouldUpdate, true);
    assert.equal(result.shouldQueue, true);
});

test("queues update when operation contains incomplete markdown heading syntax", () => {
    const result = resolveRealtimeUpdateDecision(
        {
            action: "update",
            data: "# ",
        },
        false
    );

    assert.equal(result.nextShouldUpdate, true);
    assert.equal(result.shouldQueue, true);
});

test("keeps queueing while shouldUpdate is true for insert operations", () => {
    const result = resolveRealtimeUpdateDecision(
        {
            action: "insert",
            data: "<div>普通段落</div>",
        },
        true
    );

    assert.equal(result.nextShouldUpdate, true);
    assert.equal(result.shouldQueue, true);
});
