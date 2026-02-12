import test from "node:test";
import assert from "node:assert/strict";

import { stripHeadingNumberPrefix } from "../../src/numbering/prefix_cleaner";

test("strips common arabic numbering prefixes", () => {
    assert.equal(stripHeadingNumberPrefix("1. 标题"), "标题");
    assert.equal(stripHeadingNumberPrefix("12) 标题"), "标题");
    assert.equal(stripHeadingNumberPrefix("1.2.3 标题"), "标题");
    assert.equal(stripHeadingNumberPrefix("(2) 标题"), "标题");
});

test("strips chinese numbering prefixes", () => {
    assert.equal(stripHeadingNumberPrefix("一、标题"), "标题");
    assert.equal(stripHeadingNumberPrefix("（三） 标题"), "标题");
    assert.equal(stripHeadingNumberPrefix("第3章：标题"), "标题");
    assert.equal(stripHeadingNumberPrefix("第二节 标题"), "标题");
});

test("strips chained prefixes and keeps non-number content", () => {
    assert.equal(stripHeadingNumberPrefix("1. （二） 第3章：标题"), "标题");
    assert.equal(stripHeadingNumberPrefix("2024 规划"), "2024 规划");
    assert.equal(stripHeadingNumberPrefix("API 设计"), "API 设计");
});
