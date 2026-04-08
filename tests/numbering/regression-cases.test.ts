import test from "node:test";
import assert from "node:assert/strict";

import { planHeadingUpdates } from "../../src/numbering/numbering_engine";

test("handles discontinuous heading levels without counter drift", () => {
    const result = planHeadingUpdates(
        [
            { id: "a", subtype: "h2", markdown: "## A" },
            { id: "b", subtype: "h4", markdown: "#### B" },
            { id: "c", subtype: "h3", markdown: "### C" },
        ],
        {
            formats: [
                "{1}. ",
                "{1}.{2} ",
                "{1}.{2}.{3} ",
                "{1}.{2}.{3}.{4} ",
                "{1}.{2}.{3}.{4}.{5} ",
                "{1}.{2}.{3}.{4}.{5}.{6} ",
            ],
            useChineseNumbers: [false, false, false, false, false, false],
        }
    );

    assert.deepEqual(Object.keys(result.updates), ["a", "b", "c"]);
    assert.match(result.updates.a, /^##\s+1\.\s/);
    assert.match(result.updates.b, /^####\s+1\.1\s/);
    assert.match(result.updates.c, /^###\s+1\.2\s/);
});

test("preserves plain numeric heading titles when stale numbering attrs exist", () => {
    const result = planHeadingUpdates(
        [
            { id: "a", subtype: "h1", markdown: "# Intro" },
            {
                id: "b",
                subtype: "h1",
                markdown: "# 234",
                attrs: {
                    "custom-seq-number": "7. ",
                    "custom-seq-backup-prefix": "",
                },
            },
        ],
        {
            formats: [
                "{1}. ",
                "{1}.{2} ",
                "{1}.{2}.{3} ",
                "{1}.{2}.{3}.{4} ",
                "{1}.{2}.{3}.{4}.{5} ",
                "{1}.{2}.{3}.{4}.{5}.{6} ",
            ],
            useChineseNumbers: [false, false, false, false, false, false],
        }
    );

    assert.equal(result.updates.b, "# 2. 234");
});
