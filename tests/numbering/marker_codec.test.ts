import test from "node:test";
import assert from "node:assert/strict";

import { addMarker, readMarker, stripMarker } from "../../src/numbering/marker_codec";

test("stripMarker removes auto number and restores prefix at original position", () => {
    const marked = `# ${addMarker("Heading", "1. ", "3. ")}`;
    assert.equal(stripMarker(marked, { restorePrefix: true }), "# 3. Heading");
    assert.equal(stripMarker(marked, { restorePrefix: false }), "# Heading");
});

test("stripMarker handles duplicated marker chains", () => {
    const once = addMarker("Heading", "1. ", "7. ");
    const duplicated = addMarker(once, "2. ", "");
    assert.equal(stripMarker(duplicated, { restorePrefix: true }), "7. Heading");
});

test("readMarker returns marker payload", () => {
    const marked = addMarker("Title", "1. ", "2. ");
    const payload = readMarker(marked);
    assert.equal(payload?.number, "1. ");
    assert.equal(payload?.backupPrefix, "2. ");
    assert.equal(payload?.content, "Title");
});
