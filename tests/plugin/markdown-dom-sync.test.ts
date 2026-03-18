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

test("syncLoadedHeadingMarkdownUpdates updates loaded heading blocks only", () => {
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
