import test from "node:test";
import assert from "node:assert/strict";

import {
    createNumberingService,
    NumberingServiceApi,
} from "../../src/services/numbering_service";
import { addMarker } from "../../src/numbering/marker_codec";
import {
    AUTO_NUMBER_ATTR,
    BACKUP_PREFIX_ATTR,
    CONTENT_DIGEST_ATTR,
    computeContentDigest,
} from "../../src/numbering/numbering_state";

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
        supportsAttributeNumberingState() {
            return true;
        },
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
        async updateAttrs(attrs) {
            callOrder.push(`attrs:${Object.keys(attrs).length}`);
        },
    };

    return { api, callOrder };
}

test("update flow: flush -> load headings -> compute -> update blocks", async () => {
    const fake = createFakeApi();
    const service = createNumberingService(fake.api, CONFIG);

    await service.updateDocument("doc-1");

    assert.deepEqual(fake.callOrder, ["flush", "load", "attrs:2", "update:2"]);
});

test("clear flow keeps call order and clears only marker-based numbering", async () => {
    const fake = createFakeApi();
    const service = createNumberingService(fake.api, CONFIG);

    await service.clearDocument("doc-1", { preservePrefix: false });

    assert.deepEqual(fake.callOrder, ["flush", "load"]);
});

test("clear all flow removes user-defined heading numbering", async () => {
    const callOrder: string[] = [];
    const api: NumberingServiceApi = {
        supportsAttributeNumberingState() {
            return true;
        },
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
        async updateAttrs(attrs) {
            callOrder.push(`attrs:${Object.keys(attrs).length}`);
        },
    };

    const service = createNumberingService(api, CONFIG);
    await service.clearAllNumbering("doc-1");

    assert.deepEqual(callOrder, ["flush", "load", "update:1"]);
});

test("update flow stores numbering state in block attrs and removes legacy markers", async () => {
    let recordedUpdates: Record<string, string> | null = null;
    let recordedAttrs: Record<string, Record<string, string>> | null = null;

    const api: NumberingServiceApi = {
        supportsAttributeNumberingState() {
            return true;
        },
        async getVersion() {
            return "3.1.25";
        },
        async flushTransactions() {
            return undefined;
        },
        async getDocHeadingBlocks() {
            return [
                {
                    id: "a",
                    subtype: "h1",
                    markdown: `# ${addMarker("Title A", "9. ", "")}`,
                },
            ];
        },
        async updateBlocks(updates) {
            recordedUpdates = updates;
        },
        async updateAttrs(attrs) {
            recordedAttrs = attrs;
        },
    };

    const service = createNumberingService(api, CONFIG);
    await service.updateDocument("doc-1");

    assert.deepEqual(recordedUpdates, {
        a: "# 1. Title A",
    });
    assert.deepEqual(recordedAttrs, {
        a: {
            [AUTO_NUMBER_ATTR]: "1. ",
            [BACKUP_PREFIX_ATTR]: "",
            [CONTENT_DIGEST_ATTR]: computeContentDigest("Title A"),
        },
    });
});

test("clear flow removes stored attrs together with visible numbering", async () => {
    let recordedUpdates: Record<string, string> | null = null;
    let recordedAttrs: Record<string, Record<string, string>> | null = null;

    const api: NumberingServiceApi = {
        supportsAttributeNumberingState() {
            return true;
        },
        async getVersion() {
            return "3.1.25";
        },
        async flushTransactions() {
            return undefined;
        },
        async getDocHeadingBlocks() {
            return [
                {
                    id: "a",
                    subtype: "h1",
                    markdown: "# 1. Title A",
                    attrs: {
                        [AUTO_NUMBER_ATTR]: "1. ",
                        [BACKUP_PREFIX_ATTR]: "",
                        [CONTENT_DIGEST_ATTR]: computeContentDigest("Title A"),
                    },
                },
            ];
        },
        async updateBlocks(updates) {
            recordedUpdates = updates;
        },
        async updateAttrs(attrs) {
            recordedAttrs = attrs;
        },
    };

    const service = createNumberingService(api, CONFIG);
    await service.clearDocument("doc-1", { preservePrefix: false });

    assert.deepEqual(recordedUpdates, {
        a: "# Title A",
    });
    assert.deepEqual(recordedAttrs, {
        a: {
            [AUTO_NUMBER_ATTR]: "",
            [BACKUP_PREFIX_ATTR]: "",
            [CONTENT_DIGEST_ATTR]: "",
        },
    });
});

test("update flow clears attrs when attr write fails after partial success", async () => {
    const attrCalls: Array<Record<string, Record<string, string>>> = [];
    const blockCalls: Array<Record<string, string>> = [];

    const api: NumberingServiceApi = {
        supportsAttributeNumberingState() {
            return true;
        },
        async getVersion() {
            return "3.1.25";
        },
        async flushTransactions() {
            return undefined;
        },
        async getDocHeadingBlocks() {
            return [
                { id: "a", subtype: "h1", markdown: "# Title A" },
                { id: "b", subtype: "h1", markdown: "# Title B" },
            ];
        },
        async updateBlocks(updates) {
            blockCalls.push(updates);
        },
        async updateAttrs(attrs) {
            attrCalls.push(attrs);
            if (attrCalls.length === 1) {
                throw new Error("set attrs failed");
            }
        },
    };

    const service = createNumberingService(api, CONFIG);

    await assert.rejects(() => service.updateDocument("doc-1"), /set attrs failed/);

    assert.equal(blockCalls.length, 0);
    assert.deepEqual(attrCalls, [
        {
            a: {
                [AUTO_NUMBER_ATTR]: "1. ",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Title A"),
            },
            b: {
                [AUTO_NUMBER_ATTR]: "2. ",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Title B"),
            },
        },
        {
            a: {
                [AUTO_NUMBER_ATTR]: "",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: "",
            },
            b: {
                [AUTO_NUMBER_ATTR]: "",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: "",
            },
        },
    ]);
});

test("update flow restores previous attrs when block write fails", async () => {
    const attrCalls: Array<Record<string, Record<string, string>>> = [];

    const api: NumberingServiceApi = {
        supportsAttributeNumberingState() {
            return true;
        },
        async getVersion() {
            return "3.1.25";
        },
        async flushTransactions() {
            return undefined;
        },
        async getDocHeadingBlocks() {
            return [
                {
                    id: "a",
                    subtype: "h1",
                    markdown: "# 3. Title A",
                    attrs: {
                        [AUTO_NUMBER_ATTR]: "3. ",
                        [BACKUP_PREFIX_ATTR]: "",
                        [CONTENT_DIGEST_ATTR]: computeContentDigest("Title A"),
                    },
                },
            ];
        },
        async updateBlocks() {
            throw new Error("update block failed");
        },
        async updateAttrs(attrs) {
            attrCalls.push(attrs);
        },
    };

    const service = createNumberingService(api, CONFIG);

    await assert.rejects(
        () => service.updateDocument("doc-1"),
        /update block failed/
    );

    assert.deepEqual(attrCalls, [
        {
            a: {
                [AUTO_NUMBER_ATTR]: "1. ",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Title A"),
            },
        },
        {
            a: {
                [AUTO_NUMBER_ATTR]: "3. ",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Title A"),
            },
        },
    ]);
});

test("update flow skips attr and block writes when document is already up to date", async () => {
    const callOrder: string[] = [];
    const api: NumberingServiceApi = {
        supportsAttributeNumberingState() {
            return true;
        },
        async getVersion() {
            return "3.1.25";
        },
        async flushTransactions() {
            callOrder.push("flush");
        },
        async getDocHeadingBlocks() {
            callOrder.push("load");
            return [
                {
                    id: "a",
                    subtype: "h1",
                    markdown: "# 1. Title A",
                    attrs: {
                        [AUTO_NUMBER_ATTR]: "1. ",
                        [BACKUP_PREFIX_ATTR]: "",
                        [CONTENT_DIGEST_ATTR]: computeContentDigest("Title A"),
                    },
                },
            ];
        },
        async updateBlocks(updates) {
            callOrder.push(`update:${Object.keys(updates).length}`);
        },
        async updateAttrs(attrs) {
            callOrder.push(`attrs:${Object.keys(attrs).length}`);
        },
    };

    const service = createNumberingService(api, CONFIG);
    const updates = await service.updateDocument("doc-1");

    assert.deepEqual(updates, {});
    assert.deepEqual(callOrder, ["flush", "load"]);
});

test("update flow falls back to legacy markers when attribute state is unsupported", async () => {
    let recordedUpdates: Record<string, string> | null = null;
    let attrCalls = 0;

    const api: NumberingServiceApi = {
        supportsAttributeNumberingState() {
            return false;
        },
        async getVersion() {
            return "3.1.25";
        },
        async flushTransactions() {
            return undefined;
        },
        async getDocHeadingBlocks() {
            return [{ id: "a", subtype: "h1", markdown: "# Title A" }];
        },
        async updateBlocks(updates) {
            recordedUpdates = updates;
        },
        async updateAttrs() {
            attrCalls++;
        },
    };

    const service = createNumberingService(api, CONFIG);
    await service.updateDocument("doc-1");

    assert.equal(attrCalls, 0);
    assert.equal(typeof recordedUpdates?.a, "string");
    assert.match(String(recordedUpdates?.a), /^# 1\. /);
    assert.match(String(recordedUpdates?.a), /Title A/);
    assert.equal(String(recordedUpdates?.a).includes("\u2063\u2064\u2063"), true);
});

test("clear flow keeps markdown cleanup when attribute state becomes unsupported at write time", async () => {
    let supportsAttributeState = true;
    let recordedUpdates: Record<string, string> | null = null;
    let attrCalls = 0;

    const api: NumberingServiceApi = {
        supportsAttributeNumberingState() {
            return supportsAttributeState;
        },
        async getVersion() {
            return "3.1.25";
        },
        async flushTransactions() {
            return undefined;
        },
        async getDocHeadingBlocks() {
            return [
                {
                    id: "a",
                    subtype: "h1",
                    markdown: "# 1. Title A",
                    attrs: {
                        [AUTO_NUMBER_ATTR]: "1. ",
                        [BACKUP_PREFIX_ATTR]: "",
                        [CONTENT_DIGEST_ATTR]: computeContentDigest("Title A"),
                    },
                },
            ];
        },
        async updateBlocks(updates) {
            recordedUpdates = updates;
        },
        async updateAttrs() {
            attrCalls++;
            supportsAttributeState = false;
            throw new Error("attrs unsupported");
        },
    };

    const service = createNumberingService(api, CONFIG);
    const updates = await service.clearDocument("doc-1", { preservePrefix: false });

    assert.equal(attrCalls, 1);
    assert.deepEqual(updates, {
        a: "# Title A",
    });
    assert.deepEqual(recordedUpdates, {
        a: "# Title A",
    });
});

test("clear all flow still removes visible numbering when attribute state becomes unsupported at write time", async () => {
    let supportsAttributeState = true;
    let recordedUpdates: Record<string, string> | null = null;
    let attrCalls = 0;

    const api: NumberingServiceApi = {
        supportsAttributeNumberingState() {
            return supportsAttributeState;
        },
        async getVersion() {
            return "3.1.25";
        },
        async flushTransactions() {
            return undefined;
        },
        async getDocHeadingBlocks() {
            return [
                {
                    id: "a",
                    subtype: "h1",
                    markdown: "# 1. Title A",
                    attrs: {
                        [AUTO_NUMBER_ATTR]: "1. ",
                        [BACKUP_PREFIX_ATTR]: "",
                        [CONTENT_DIGEST_ATTR]: computeContentDigest("Title A"),
                    },
                },
            ];
        },
        async updateBlocks(updates) {
            recordedUpdates = updates;
        },
        async updateAttrs() {
            attrCalls++;
            supportsAttributeState = false;
            throw new Error("attrs unsupported");
        },
    };

    const service = createNumberingService(api, CONFIG);
    const updates = await service.clearAllNumbering("doc-1");

    assert.equal(attrCalls, 1);
    assert.deepEqual(updates, {
        a: "# Title A",
    });
    assert.deepEqual(recordedUpdates, {
        a: "# Title A",
    });
});

test("clear flow still removes visible numbering on later runs after attr writes become unsupported", async () => {
    let supportsAttributeState = true;
    let markdown = "# 1. Title A";
    const blockCalls: Array<Record<string, string>> = [];

    const api: NumberingServiceApi = {
        supportsAttributeNumberingState() {
            return supportsAttributeState;
        },
        async getVersion() {
            return "3.1.25";
        },
        async flushTransactions() {
            return undefined;
        },
        async getDocHeadingBlocks() {
            return [
                {
                    id: "a",
                    subtype: "h1",
                    markdown,
                    attrs: {
                        [AUTO_NUMBER_ATTR]: "1. ",
                        [BACKUP_PREFIX_ATTR]: "",
                        [CONTENT_DIGEST_ATTR]: computeContentDigest("Title A"),
                    },
                },
            ];
        },
        async updateBlocks(updates) {
            blockCalls.push(updates);
            markdown = updates.a ?? markdown;
        },
        async updateAttrs() {
            supportsAttributeState = false;
            throw new Error("attrs unsupported");
        },
    };

    const service = createNumberingService(api, CONFIG);

    await service.clearDocument("doc-1", { preservePrefix: false });
    markdown = "# 1. Title A";
    const second = await service.clearDocument("doc-1", { preservePrefix: false });

    assert.deepEqual(second, {
        a: "# Title A",
    });
    assert.deepEqual(blockCalls, [{ a: "# Title A" }, { a: "# Title A" }]);
});
