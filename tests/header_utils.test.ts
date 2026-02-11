import test from "node:test";
import assert from "node:assert/strict";

import {
    addAutoNumberMarker,
    buildAutoNumberedHeadingContent,
    extractAutoNumberMarkerInfo,
    stripAutoNumberMarker,
} from "../src/utils/header_utils.ts";

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
