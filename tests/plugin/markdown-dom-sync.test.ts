import test from "node:test";
import assert from "node:assert/strict";

import {
    extractEditableContentFromBlockDom,
    renderHeadingMarkdownToHtmlContent,
    syncLoadedHeadingMarkdownUpdates,
} from "../../src/plugin/markdown_dom_sync";

test("extractEditableContentFromBlockDom returns editable inner html", () => {
    const html =
        '<div data-type="NodeHeading"><div contenteditable="true"><span>一、标题</span></div></div>';

    assert.equal(
        extractEditableContentFromBlockDom(html),
        "<span>一、标题</span>"
    );
});

test("renderHeadingMarkdownToHtmlContent renders markdown through block dom renderer", () => {
    const content = renderHeadingMarkdownToHtmlContent(
        "# **一、标题**",
        () =>
            '<div data-type="NodeHeading"><div contenteditable="true"><strong>一、标题</strong></div></div>'
    );

    assert.equal(content, "<strong>一、标题</strong>");
});

test("renderHeadingMarkdownToHtmlContent returns null when block dom has no editable content", () => {
    const content = renderHeadingMarkdownToHtmlContent("# 标题", () => "<div></div>");

    assert.equal(content, null);
});

test("syncLoadedHeadingMarkdownUpdates uses batch transaction when available", () => {
    const editableA = { innerHTML: "old-a" };
    const editableB = { innerHTML: "old-b" };
    const blockA = {
        getAttribute(name: string) {
            return name === "data-node-id" ? "block-a" : null;
        },
        querySelector(selector: string) {
            return selector === '[contenteditable="true"]' ? editableA : null;
        },
    };
    const blockB = {
        getAttribute(name: string) {
            return name === "data-node-id" ? "block-b" : null;
        },
        querySelector(selector: string) {
            return selector === '[contenteditable="true"]' ? editableB : null;
        },
    };
    const root = {
        querySelector(selector: string) {
            if (selector === '[data-node-id="block-a"]') {
                return blockA;
            }
            if (selector === '[data-node-id="block-b"]') {
                return blockB;
            }
            return null;
        },
    };

    const calls: string[][] = [];
    const protyle = {
        wysiwyg: { element: root },
        lute: {
            Md2BlockDOM(markdown: string) {
                if (markdown.includes("第一章")) {
                    return '<div data-type="NodeHeading"><div contenteditable="true"><span>1. 第一章</span></div></div>';
                }
                return '<div data-type="NodeHeading"><div contenteditable="true"><span>1.1 第二节</span></div></div>';
            },
        },
        updateBatchTransaction(
            elements: Array<typeof blockA>,
            updater: (element: typeof blockA) => void
        ) {
            calls.push(
                elements.map(
                    (element) => element.getAttribute("data-node-id") || ""
                )
            );
            for (const element of elements) {
                updater(element);
            }
        },
    };

    const count = syncLoadedHeadingMarkdownUpdates(protyle, {
        "block-a": "# 第一章",
        "block-b": "## 第二节",
        "block-c": "### 未加载",
    });

    assert.equal(count, 2);
    assert.deepEqual(calls, [["block-a", "block-b"]]);
    assert.equal(editableA.innerHTML, "<span>1. 第一章</span>");
    assert.equal(editableB.innerHTML, "<span>1.1 第二节</span>");
});

test("syncLoadedHeadingMarkdownUpdates falls back to direct DOM update", () => {
    const editableA = { innerHTML: "old-a" };
    const editableB = { innerHTML: "old-b" };
    const blockA = {
        querySelector(selector: string) {
            return selector === '[contenteditable="true"]' ? editableA : null;
        },
    };
    const blockB = {
        querySelector(selector: string) {
            return selector === '[contenteditable="true"]' ? editableB : null;
        },
    };
    const root = {
        querySelector(selector: string) {
            if (selector === '[data-node-id="block-a"]') {
                return blockA;
            }
            if (selector === '[data-node-id="block-b"]') {
                return blockB;
            }
            return null;
        },
    };
    const protyle = {
        wysiwyg: { element: root },
        lute: {
            Md2BlockDOM(markdown: string) {
                if (markdown.includes("第一章")) {
                    return '<div data-type="NodeHeading"><div contenteditable="true"><span>1. 第一章</span></div></div>';
                }
                return '<div data-type="NodeHeading"><div contenteditable="true"><span>1.1 第二节</span></div></div>';
            },
        },
    };

    const count = syncLoadedHeadingMarkdownUpdates(protyle, {
        "block-a": "# 第一章",
        "block-b": "## 第二节",
        "block-c": "### 未加载",
    });

    assert.equal(count, 2);
    assert.equal(editableA.innerHTML, "<span>1. 第一章</span>");
    assert.equal(editableB.innerHTML, "<span>1.1 第二节</span>");
});
