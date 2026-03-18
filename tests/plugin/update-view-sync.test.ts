import test from "node:test";
import assert from "node:assert/strict";

import { shouldSyncLoadedViewAfterUpdate } from "../../src/plugin/update_view_sync";

test("manual toggle syncs loaded view after numbering update", () => {
    assert.equal(shouldSyncLoadedViewAfterUpdate("manual-toggle"), true);
});

test("realtime update syncs loaded view", () => {
    assert.equal(shouldSyncLoadedViewAfterUpdate("realtime"), true);
});

test("initial load syncs loaded view", () => {
    assert.equal(shouldSyncLoadedViewAfterUpdate("load"), true);
});
