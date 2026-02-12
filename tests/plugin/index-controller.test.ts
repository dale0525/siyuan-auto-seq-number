import test from "node:test";
import assert from "node:assert/strict";

import { routeToggleNumbering } from "../../src/plugin/index_controller";

test("toggle routes to update when doc is disabled", async () => {
    const calls: string[] = [];
    const result = await routeToggleNumbering({
        activeDocId: "doc-1",
        isEnabled: false,
        preservePrefixOnClear: true,
        service: {
            async updateDocument(docId: string) {
                calls.push(`update:${docId}`);
            },
            async clearDocument() {
                calls.push("clear");
            },
        },
    });

    assert.equal(result, "updated");
    assert.deepEqual(calls, ["update:doc-1"]);
});

test("toggle routes to clear when doc is enabled", async () => {
    const calls: string[] = [];
    const result = await routeToggleNumbering({
        activeDocId: "doc-1",
        isEnabled: true,
        preservePrefixOnClear: false,
        service: {
            async updateDocument() {
                calls.push("update");
            },
            async clearDocument(docId: string, options) {
                calls.push(`clear:${docId}:${options.preservePrefix}`);
            },
        },
    });

    assert.equal(result, "cleared");
    assert.deepEqual(calls, ["clear:doc-1:false"]);
});

test("toggle is noop without active document", async () => {
    const result = await routeToggleNumbering({
        activeDocId: null,
        isEnabled: false,
        preservePrefixOnClear: true,
        service: {
            async updateDocument() {
                throw new Error("should not call update");
            },
            async clearDocument() {
                throw new Error("should not call clear");
            },
        },
    });

    assert.equal(result, "noop");
});
