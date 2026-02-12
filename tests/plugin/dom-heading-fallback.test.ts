import test from "node:test";
import assert from "node:assert/strict";

import {
    buildDomClearAllUpdates,
    buildDomClearUpdates,
    buildDomNumberingUpdates,
} from "../../src/plugin/dom_heading_fallback";

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

test("buildDomNumberingUpdates numbers heading html content by level order", () => {
    const updates = buildDomNumberingUpdates(
        [
            { id: "a", level: 1, htmlContent: "一级标题1" },
            { id: "b", level: 2, htmlContent: "二级标题1" },
        ],
        CONFIG
    );

    assert.match(updates.a || "", /^1\.\s/);
    assert.match(updates.b || "", /^1\.1\s/);
});

test("buildDomNumberingUpdates skips unchanged heading content", () => {
    const updates = buildDomNumberingUpdates(
        [{ id: "a", level: 1, htmlContent: "1. 一级标题1" }],
        CONFIG
    );

    assert.deepEqual(updates, {});
});

test("buildDomClearUpdates removes generated numbering", () => {
    const updates = buildDomClearUpdates(
        [
            { id: "a", level: 1, htmlContent: "1. 一级标题1" },
            { id: "b", level: 2, htmlContent: "1.1 二级标题1" },
        ],
        CONFIG
    );

    assert.equal(updates.a, "一级标题1");
    assert.equal(updates.b, "二级标题1");
});

test("buildDomClearAllUpdates removes user-defined numbering", () => {
    const updates = buildDomClearAllUpdates([
        { id: "a", level: 1, htmlContent: "1. 一级标题1" },
        { id: "b", level: 2, htmlContent: "（二） 二级标题1" },
        { id: "c", level: 1, htmlContent: "2024 规划" },
    ]);

    assert.equal(updates.a, "一级标题1");
    assert.equal(updates.b, "二级标题1");
    assert.equal("c" in updates, false);
});
