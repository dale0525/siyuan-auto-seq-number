import test from "node:test";
import assert from "node:assert/strict";

import {
    addAutoNumberMarker,
    buildAutoNumberedHeadingContent,
    extractAutoNumberMarkerInfo,
    generateHeaderNumber,
    splitMarkdownHeading,
    stripAutoNumberMarker,
} from "../src/utils/header_utils.ts";


const DEFAULT_FORMATS = [
    "{1}. ",
    "{1}.{2} ",
    "{1}.{2}.{3} ",
    "{1}.{2}.{3}.{4} ",
    "{1}.{2}.{3}.{4}.{5} ",
    "{1}.{2}.{3}.{4}.{5}.{6} ",
];
const DEFAULT_CHINESE_NUMBERS = [false, false, false, false, false, false];

function renumberHeadings(
    headings: Array<{ level: number; markdown: string }>
): string[] {
    const existingLevels = Array.from(new Set(headings.map((heading) => heading.level))).sort(
        (left, right) => left - right
    );
    const counters = [0, 0, 0, 0, 0, 0];

    return headings.map((heading) => {
        const headingParts = splitMarkdownHeading(heading.markdown);
        assert.ok(headingParts);

        const [number, newCounters] = generateHeaderNumber(
            heading.level,
            counters,
            DEFAULT_FORMATS,
            DEFAULT_CHINESE_NUMBERS,
            existingLevels
        );
        Object.assign(counters, newCounters);

        return `${headingParts.prefix}${buildAutoNumberedHeadingContent(
            headingParts.content,
            number,
            true
        )}`;
    });
}

test("stripAutoNumberMarker should clear duplicated markers and restore preserved prefix", () => {
    const base = addAutoNumberMarker("1. ", "3. ") + "Manual title";
    const duplicated = addAutoNumberMarker("2. ") + base;

    assert.equal(stripAutoNumberMarker(duplicated, true), "3. Manual title");
    assert.equal(stripAutoNumberMarker(duplicated, false), "Manual title");
});

test("extractAutoNumberMarkerInfo should recover clean content for malformed duplicated markers", () => {
    const firstRound = addAutoNumberMarker("1. ", "3. ") + "Manual title";
    const broken = addAutoNumberMarker("2. ") + firstRound;

    const info = extractAutoNumberMarkerInfo(broken);
    assert.ok(info);
    assert.equal(info.backupPrefix, "3. ");
    assert.equal(info.content, "Manual title");
});

test("buildAutoNumberedHeadingContent should keep user text when no marker exists", () => {
    const renumbered = buildAutoNumberedHeadingContent("3. Manual title", "1. ");

    assert.equal(stripAutoNumberMarker(renumbered, true), "3. Manual title");
    assert.equal(stripAutoNumberMarker(renumbered, false), "3. Manual title");
});

test("buildAutoNumberedHeadingContent should keep backup prefix when heading already has marker", () => {
    const firstRound = addAutoNumberMarker("1. ", "3. ") + "Manual title";
    const renumbered = buildAutoNumberedHeadingContent(firstRound, "2. ");

    assert.equal(stripAutoNumberMarker(renumbered, true), "3. Manual title");
    assert.equal(stripAutoNumberMarker(renumbered, false), "Manual title");
});


test("buildAutoNumberedHeadingContent should support legacy auto prefix recovery", () => {
    const renumbered = buildAutoNumberedHeadingContent("1. Legacy title", "1. ", true);

    assert.equal(stripAutoNumberMarker(renumbered, true), "1. Legacy title");
    assert.equal(stripAutoNumberMarker(renumbered, false), "Legacy title");
});


test("stripAutoNumberMarker should recover malformed markdown heading from old marker position", () => {
    const malformed = `${addAutoNumberMarker("2. ")}# Heading`;

    assert.equal(stripAutoNumberMarker(malformed, true), "# Heading");
    assert.equal(stripAutoNumberMarker(malformed, false), "# Heading");
});

test("stripAutoNumberMarker should restore backup prefix inside markdown heading content", () => {
    const markdown = `# ${addAutoNumberMarker("1. ", "3. ")}Heading`;

    assert.equal(stripAutoNumberMarker(markdown, true), "# 3. Heading");
    assert.equal(stripAutoNumberMarker(markdown, false), "# Heading");
});

test("stripAutoNumberMarker should recover duplicated marker chain in markdown heading", () => {
    const contentWithBackup = addAutoNumberMarker("1. ", "7. ") + "Heading";
    const duplicatedMarkdown = `# ${addAutoNumberMarker("2. ")}${contentWithBackup}`;

    assert.equal(stripAutoNumberMarker(duplicatedMarkdown, true), "# 7. Heading");
    assert.equal(stripAutoNumberMarker(duplicatedMarkdown, false), "# Heading");
});

test("buildAutoNumberedHeadingContent should replace legacy auto prefix when format changes", () => {
    const renumbered = buildAutoNumberedHeadingContent("1.1 Title", "1.1. ", true);
    const markerInfo = extractAutoNumberMarkerInfo(renumbered);

    assert.ok(markerInfo);
    assert.equal(markerInfo.content, "Title");
    assert.equal(stripAutoNumberMarker(renumbered, true), "1.1 Title");
    assert.equal(stripAutoNumberMarker(renumbered, false), "Title");
});

test("renumberHeadings should stay stable after clear and reapply with mixed heading levels", () => {
    const source = [
        { level: 1, markdown: "# 1. Root" },
        { level: 3, markdown: "### 1.1 Third level" },
        { level: 2, markdown: "## 1.2 Second level" },
        { level: 4, markdown: "#### 1.2.1 Fourth level" },
        { level: 1, markdown: "# Another root" },
    ];

    const firstRound = renumberHeadings(source);
    const cleared = firstRound.map((markdown) => {
        return stripAutoNumberMarker(markdown, true);
    });

    const secondRound = renumberHeadings(
        source.map((heading, index) => {
            return {
                level: heading.level,
                markdown: cleared[index],
            };
        })
    );

    assert.deepEqual(secondRound, firstRound);
});

