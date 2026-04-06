import test from "node:test";
import assert from "node:assert/strict";

import {
    clearAllHeadingNumbering,
    clearAutoNumbering,
    HeadingBlock,
    NumberingConfig,
    planHeadingUpdates,
} from "../../src/numbering/numbering_engine";
import { addMarker } from "../../src/numbering/marker_codec";
import {
    AUTO_NUMBER_ATTR,
    BACKUP_PREFIX_ATTR,
    CONTENT_DIGEST_ATTR,
    computeContentDigest,
} from "../../src/numbering/numbering_state";

const DEFAULT_CONFIG: NumberingConfig = {
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

function toBlocksFromUpdates(
    source: HeadingBlock[],
    updates: Record<string, string>
): HeadingBlock[] {
    return source.map((block) => {
        return {
            ...block,
            markdown: updates[block.id] ?? block.markdown,
        };
    });
}

test("planHeadingUpdates stays stable after clear and reapply", () => {
    const source: HeadingBlock[] = [
        { id: "a", subtype: "h1", markdown: "# 1. Root" },
        { id: "b", subtype: "h3", markdown: "### 1.1 Third level" },
        { id: "c", subtype: "h2", markdown: "## 1.2 Second level" },
        { id: "d", subtype: "h4", markdown: "#### 1.2.1 Fourth level" },
        { id: "e", subtype: "h1", markdown: "# Another root" },
    ];

    const first = planHeadingUpdates(source, DEFAULT_CONFIG);
    const cleared = clearAutoNumbering(
        toBlocksFromUpdates(source, first.updates),
        { preservePrefix: true }
    );
    const second = planHeadingUpdates(
        toBlocksFromUpdates(source, cleared.updates),
        DEFAULT_CONFIG
    );

    assert.deepEqual(second.updates, first.updates);
});

test("clearAutoNumbering without prefix preservation supports deterministic reorder", () => {
    const source: HeadingBlock[] = [
        { id: "a", subtype: "h1", markdown: "# 测试1" },
        { id: "b", subtype: "h1", markdown: "# 测试2" },
    ];

    const first = planHeadingUpdates(source, DEFAULT_CONFIG);
    const firstBlocks = toBlocksFromUpdates(source, first.updates);
    const cleared = clearAutoNumbering(firstBlocks, { preservePrefix: false });
    const reordered = [
        { ...source[1], markdown: cleared.updates.b ?? source[1].markdown },
        { ...source[0], markdown: cleared.updates.a ?? source[0].markdown },
    ];

    const second = planHeadingUpdates(reordered, DEFAULT_CONFIG);
    assert.match(second.updates.b, /^#\s*1\.\s/);
    assert.match(second.updates.a, /^#\s*2\.\s/);
});

test("planHeadingUpdates supports heading blocks whose markdown has no hash prefix", () => {
    const source: HeadingBlock[] = [
        { id: "a", subtype: "h1", markdown: "一级标题1" },
        { id: "b", subtype: "h2", markdown: "二级标题1" },
    ];

    const result = planHeadingUpdates(source, DEFAULT_CONFIG);
    assert.equal(Object.keys(result.updates).length, 2);
    assert.match(result.updates.a, /^1\.\s/);
    assert.match(result.updates.b, /^1\.1\s/);
    assert.equal(result.updates.a.startsWith("#"), false);
    assert.equal(result.updates.b.startsWith("#"), false);
});

test("clearAllHeadingNumbering removes marker-based and user-defined heading prefixes", () => {
    const source: HeadingBlock[] = [
        { id: "a", subtype: "h1", markdown: "# 1. 标题A" },
        { id: "b", subtype: "h2", markdown: "## （二） 标题B" },
        { id: "c", subtype: "h3", markdown: "### 第3章：标题C" },
        { id: "d", subtype: "h1", markdown: "# 2024 规划" },
        { id: "e", subtype: "h1", markdown: `# ${addMarker("标题E", "1. ", "2. ")}` },
        { id: "f", subtype: "h1", markdown: "1. 无井号标题F" },
    ];

    const result = clearAllHeadingNumbering(source);

    assert.equal(result.updates.a, "# 标题A");
    assert.equal(result.updates.b, "## 标题B");
    assert.equal(result.updates.c, "### 标题C");
    assert.equal(result.updates.e, "# 标题E");
    assert.equal(result.updates.f, "无井号标题F");
    assert.equal("d" in result.updates, false);
});

test("planHeadingUpdates replaces visible numbering even when stored attrs are stale", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 2. Title",
            attrs: {
                [AUTO_NUMBER_ATTR]: "1. ",
                [BACKUP_PREFIX_ATTR]: "",
            },
        },
    ];

    const result = planHeadingUpdates(source, DEFAULT_CONFIG);

    assert.equal(result.updates.a, "# 1. Title");
});

test("planHeadingUpdates keeps numeric title content when stored attrs are stale", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 3 things to know",
            attrs: {
                [AUTO_NUMBER_ATTR]: "7. ",
                [BACKUP_PREFIX_ATTR]: "",
            },
        },
    ];

    const result = planHeadingUpdates(source, DEFAULT_CONFIG);

    assert.equal(result.updates.a, "# 1. 3 things to know");
});

test("clearAutoNumbering removes visible numbering even when stored attrs are stale", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 2. Title",
            attrs: {
                [AUTO_NUMBER_ATTR]: "1. ",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Title"),
            },
        },
    ];

    const result = clearAutoNumbering(source, { preservePrefix: false });

    assert.equal(result.updates.a, "# Title");
    assert.deepEqual(result.attrs.a, {
        [AUTO_NUMBER_ATTR]: "",
        [BACKUP_PREFIX_ATTR]: "",
        [CONTENT_DIGEST_ATTR]: "",
    });
});

test("planHeadingUpdates preserves numeric title content for separator-free formats", () => {
    const config: NumberingConfig = {
        formats: [
            "{1} ",
            "{1}{2} ",
            "{1}{2}{3} ",
            "{1}{2}{3}{4} ",
            "{1}{2}{3}{4}{5} ",
            "{1}{2}{3}{4}{5}{6} ",
        ],
        useChineseNumbers: [false, false, false, false, false, false],
    };
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 3 things to know",
            attrs: {
                [AUTO_NUMBER_ATTR]: "7 ",
                [BACKUP_PREFIX_ATTR]: "",
            },
        },
    ];

    const result = planHeadingUpdates(source, config);

    assert.equal(result.updates.a, "# 1 3 things to know");
});

test("clearAutoNumbering preserves numeric title content for separator-free formats", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 3 things to know",
            attrs: {
                [AUTO_NUMBER_ATTR]: "7 ",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("3 things to know"),
            },
        },
    ];

    const result = clearAutoNumbering(source, { preservePrefix: false });

    assert.equal(result.updates.a, undefined);
    assert.deepEqual(result.attrs.a, {
        [AUTO_NUMBER_ATTR]: "",
        [BACKUP_PREFIX_ATTR]: "",
        [CONTENT_DIGEST_ATTR]: "",
    });
});

test("planHeadingUpdates replaces visible numbering for true separator-free formats when content digest matches", () => {
    const config: NumberingConfig = {
        formats: ["{1}", "{1}{2}", "{1}{2}{3}", "{1}{2}{3}{4}", "{1}{2}{3}{4}{5}", "{1}{2}{3}{4}{5}{6}"],
        useChineseNumbers: [false, false, false, false, false, false],
    };
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 2Title",
            attrs: {
                [AUTO_NUMBER_ATTR]: "1",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Title"),
            },
        },
    ];

    const result = planHeadingUpdates(source, config);

    assert.equal(result.updates.a, "# 1Title");
});

test("clearAutoNumbering removes visible numbering for true separator-free formats when content digest matches", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 2Title",
            attrs: {
                [AUTO_NUMBER_ATTR]: "1",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Title"),
            },
        },
    ];

    const result = clearAutoNumbering(source, { preservePrefix: false });

    assert.equal(result.updates.a, "# Title");
    assert.deepEqual(result.attrs.a, {
        [AUTO_NUMBER_ATTR]: "",
        [BACKUP_PREFIX_ATTR]: "",
        [CONTENT_DIGEST_ATTR]: "",
    });
});

test("planHeadingUpdates keeps user numeric content for true separator-free formats when content digest mismatches", () => {
    const config: NumberingConfig = {
        formats: ["{1}", "{1}{2}", "{1}{2}{3}", "{1}{2}{3}{4}", "{1}{2}{3}{4}{5}", "{1}{2}{3}{4}{5}{6}"],
        useChineseNumbers: [false, false, false, false, false, false],
    };
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 3things",
            attrs: {
                [AUTO_NUMBER_ATTR]: "7",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Different title"),
            },
        },
    ];

    const result = planHeadingUpdates(source, config);

    assert.equal(result.updates.a, "# 13things");
});

test("planHeadingUpdates keeps exact leading numeric content for true separator-free formats when digest is stale", () => {
    const config: NumberingConfig = {
        formats: ["{1}", "{1}{2}", "{1}{2}{3}", "{1}{2}{3}{4}", "{1}{2}{3}{4}{5}", "{1}{2}{3}{4}{5}{6}"],
        useChineseNumbers: [false, false, false, false, false, false],
    };
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# Intro",
        },
        {
            id: "b",
            subtype: "h1",
            markdown: "# 1st steps",
            attrs: {
                [AUTO_NUMBER_ATTR]: "1",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Different title"),
            },
        },
    ];

    const result = planHeadingUpdates(source, config);

    assert.equal(result.updates.b, "# 21st steps");
});

test("clearAutoNumbering removes visible numbering when stored number still matches but digest is stale", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 1. Version notes",
            attrs: {
                [AUTO_NUMBER_ATTR]: "1. ",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Different title"),
            },
        },
    ];

    const result = clearAutoNumbering(source, { preservePrefix: false });

    assert.equal(result.updates.a, "# Version notes");
    assert.deepEqual(result.attrs.a, {
        [AUTO_NUMBER_ATTR]: "",
        [BACKUP_PREFIX_ATTR]: "",
        [CONTENT_DIGEST_ATTR]: "",
    });
});

test("planHeadingUpdates does not strip visible numeric title content when attrs are stale and content digest mismatches", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 3. Version notes",
            attrs: {
                [AUTO_NUMBER_ATTR]: "7. ",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Different title"),
            },
        },
    ];

    const result = planHeadingUpdates(source, DEFAULT_CONFIG);

    assert.equal(result.updates.a, "# 1. 3. Version notes");
});

test("planHeadingUpdates does not strip user content when stale attrs keep a non-empty backup prefix", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# Chapter 9 News",
            attrs: {
                [AUTO_NUMBER_ATTR]: "7. ",
                [BACKUP_PREFIX_ATTR]: "Chapter 9 ",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Different title"),
            },
        },
    ];

    const result = planHeadingUpdates(source, DEFAULT_CONFIG);

    assert.equal(result.updates.a, "# 1. Chapter 9 News");
    assert.deepEqual(result.attrs.a, {
        [AUTO_NUMBER_ATTR]: "1.",
        [BACKUP_PREFIX_ATTR]: "",
        [CONTENT_DIGEST_ATTR]: computeContentDigest("Chapter 9 News"),
    });
});

test("planHeadingUpdates replaces stale visible numbering when heading order changes after title edits", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h2",
            markdown: "## Intro",
        },
        {
            id: "b",
            subtype: "h2",
            markdown: "## 1. Custom Title",
            attrs: {
                [AUTO_NUMBER_ATTR]: "1. ",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Title"),
            },
        },
    ];

    const result = planHeadingUpdates(source, DEFAULT_CONFIG);

    assert.equal(result.updates.a, "## 1. Intro");
    assert.equal(result.updates.b, "## 2. Custom Title");
    assert.deepEqual(result.attrs.b, {
        [AUTO_NUMBER_ATTR]: "2.",
        [BACKUP_PREFIX_ATTR]: "",
        [CONTENT_DIGEST_ATTR]: computeContentDigest("Custom Title"),
    });
});

test("planHeadingUpdates skips unchanged headings and attrs", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 1. Title",
            attrs: {
                [AUTO_NUMBER_ATTR]: "1. ",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Title"),
            },
        },
    ];

    const result = planHeadingUpdates(source, DEFAULT_CONFIG);

    assert.deepEqual(result.updates, {});
    assert.deepEqual(result.attrs, {});
});

test("planHeadingUpdates stays stable when stored attrs lose trailing spaces", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 1. Title",
            attrs: {
                [AUTO_NUMBER_ATTR]: "1.",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Title"),
            },
        },
    ];

    const result = planHeadingUpdates(source, DEFAULT_CONFIG);

    assert.deepEqual(result.updates, {});
    assert.deepEqual(result.attrs, {});
});

test("clearAutoNumbering removes visible numbering cleanly when stored attrs lose trailing spaces", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 1. Title",
            attrs: {
                [AUTO_NUMBER_ATTR]: "1.",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Title"),
            },
        },
    ];

    const result = clearAutoNumbering(source, { preservePrefix: false });

    assert.equal(result.updates.a, "# Title");
    assert.deepEqual(result.attrs.a, {
        [AUTO_NUMBER_ATTR]: "",
        [BACKUP_PREFIX_ATTR]: "",
        [CONTENT_DIGEST_ATTR]: "",
    });
});

test("clearAllHeadingNumbering removes visible numbering for true separator-free attr state", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 1Title",
            attrs: {
                [AUTO_NUMBER_ATTR]: "1",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Title"),
            },
        },
    ];

    const result = clearAllHeadingNumbering(source, { stateStorage: "attrs" });

    assert.equal(result.updates.a, "# Title");
    assert.deepEqual(result.attrs.a, {
        [AUTO_NUMBER_ATTR]: "",
        [BACKUP_PREFIX_ATTR]: "",
        [CONTENT_DIGEST_ATTR]: "",
    });
});

test("clearAutoNumbering removes visible numbering after title edits even when digest is stale", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 1. Custom Title",
            attrs: {
                [AUTO_NUMBER_ATTR]: "1. ",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Title"),
            },
        },
    ];

    const result = clearAutoNumbering(source, { preservePrefix: false });

    assert.equal(result.updates.a, "# Custom Title");
    assert.deepEqual(result.attrs.a, {
        [AUTO_NUMBER_ATTR]: "",
        [BACKUP_PREFIX_ATTR]: "",
        [CONTENT_DIGEST_ATTR]: "",
    });
});

test("clearAutoNumbering preserves exact leading numeric content for true separator-free formats when digest is stale", () => {
    const source: HeadingBlock[] = [
        {
            id: "a",
            subtype: "h1",
            markdown: "# 1st steps",
            attrs: {
                [AUTO_NUMBER_ATTR]: "1",
                [BACKUP_PREFIX_ATTR]: "",
                [CONTENT_DIGEST_ATTR]: computeContentDigest("Different title"),
            },
        },
    ];

    const result = clearAutoNumbering(source, { preservePrefix: false });

    assert.equal(result.updates.a, undefined);
    assert.deepEqual(result.attrs.a, {
        [AUTO_NUMBER_ATTR]: "",
        [BACKUP_PREFIX_ATTR]: "",
        [CONTENT_DIGEST_ATTR]: "",
    });
});
