import test from "node:test";
import assert from "node:assert/strict";

import { splitHeadingLine } from "../../src/numbering/heading_line";

test("splitHeadingLine preserves markdown marker and content", () => {
    const parsed = splitHeadingLine("### 1.2 Title");
    assert.deepEqual(parsed, {
        prefix: "### ",
        content: "1.2 Title",
        level: 3,
    });
});

test("splitHeadingLine returns null for non-heading markdown", () => {
    assert.equal(splitHeadingLine("plain paragraph"), null);
});
