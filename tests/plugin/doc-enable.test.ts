import test from "node:test";
import assert from "node:assert/strict";

import { resolveDocEnabled } from "../../src/plugin/doc_enable";

test("resolveDocEnabled returns defaultEnabled when docId is missing", () => {
    const enabled = resolveDocEnabled(null, {}, true);
    assert.equal(enabled, true);
});

test("resolveDocEnabled prefers per-doc status when docId exists", () => {
    const enabled = resolveDocEnabled("doc-1", { "doc-1": false }, true);
    assert.equal(enabled, false);
});
