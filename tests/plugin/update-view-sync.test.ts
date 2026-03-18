import test from "node:test";
import assert from "node:assert/strict";

import { shouldReloadActiveViewAfterUpdate } from "../../src/plugin/update_view_sync";

test("manual toggle reloads active view after numbering update", () => {
    assert.equal(shouldReloadActiveViewAfterUpdate("manual-toggle"), true);
});

test("realtime update does not reload active view", () => {
    assert.equal(shouldReloadActiveViewAfterUpdate("realtime"), false);
});

test("initial load does not reload active view", () => {
    assert.equal(shouldReloadActiveViewAfterUpdate("load"), false);
});
