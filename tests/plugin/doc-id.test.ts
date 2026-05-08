import test from "node:test";
import assert from "node:assert/strict";

import { resolveDocId } from "../../src/plugin/doc_id";

test("resolveDocId reads legacy background ial id", () => {
    const docId = resolveDocId({
        background: {
            ial: {
                id: "doc-legacy",
            },
        },
    });

    assert.equal(docId, "doc-legacy");
});

test("resolveDocId falls back to block rootID", () => {
    const docId = resolveDocId({
        block: {
            rootID: "doc-root",
        },
    });

    assert.equal(docId, "doc-root");
});

test("resolveDocId reads wrapped protyle document ids", () => {
    assert.equal(
        resolveDocId({
            protyle: {
                block: {
                    rootID: "doc-wrapper",
                },
            },
        }),
        "doc-wrapper"
    );

    assert.equal(
        resolveDocId({
            model: {
                editor: {
                    protyle: {
                        background: {
                            ial: {
                                id: "doc-nested",
                            },
                        },
                    },
                },
            },
        }),
        "doc-nested"
    );
});
