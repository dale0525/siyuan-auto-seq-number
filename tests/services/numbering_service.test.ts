import test from "node:test";
import assert from "node:assert/strict";

import {
    createNumberingService,
    NumberingServiceApi,
} from "../../src/services/numbering_service";

const CONFIG = {
    formats: [
        "{1}. ",
        "{1}.{2} ",
        "{1}.{2}.{3} ",
        "{1}.{2}.{3}.{4} ",
        "{1}.{2}.{3}.{4}.{5} ",
        "{1}.{2}.{3}.{4}.{5}.{6} ",
    ],
    useChineseNumbers: [false, false, false, false, false, false],
};

function createFakeApi(): {
    api: NumberingServiceApi;
    callOrder: string[];
} {
    const callOrder: string[] = [];

    const api: NumberingServiceApi = {
        async getVersion() {
            return "3.1.25";
        },
        async flushTransactions() {
            callOrder.push("flush");
        },
        async getDocHeadingBlocks() {
            callOrder.push("load");
            return [
                { id: "a", subtype: "h1", markdown: "# Title A" },
                { id: "b", subtype: "h2", markdown: "## Title B" },
            ];
        },
        async updateBlocks(updates) {
            callOrder.push(`update:${Object.keys(updates).length}`);
        },
    };

    return { api, callOrder };
}

test("update flow: flush -> load headings -> compute -> update blocks", async () => {
    const fake = createFakeApi();
    const service = createNumberingService(fake.api, CONFIG);

    await service.updateDocument("doc-1");

    assert.deepEqual(fake.callOrder, ["flush", "load", "update:2"]);
});

test("clear flow keeps call order and clears only marker-based numbering", async () => {
    const fake = createFakeApi();
    const service = createNumberingService(fake.api, CONFIG);

    await service.clearDocument("doc-1", { preservePrefix: false });

    assert.deepEqual(fake.callOrder, ["flush", "load", "update:0"]);
});

test("clear all flow removes user-defined heading numbering", async () => {
    const callOrder: string[] = [];
    const api: NumberingServiceApi = {
        async getVersion() {
            return "3.1.25";
        },
        async flushTransactions() {
            callOrder.push("flush");
        },
        async getDocHeadingBlocks() {
            callOrder.push("load");
            return [{ id: "a", subtype: "h1", markdown: "# 1. Title A" }];
        },
        async updateBlocks(updates) {
            callOrder.push(`update:${Object.keys(updates).length}`);
        },
    };

    const service = createNumberingService(api, CONFIG);
    await service.clearAllNumbering("doc-1");

    assert.deepEqual(callOrder, ["flush", "load", "update:1"]);
});
