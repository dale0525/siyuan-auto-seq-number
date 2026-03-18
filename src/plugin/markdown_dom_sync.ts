export type BlockDomRenderer = (markdown: string) => string;

interface IContentEditableLike {
    innerHTML: string;
}

interface IQueryRootLike {
    querySelector?: (selector: string) => unknown;
}

function extractEditableContentWithDomParser(blockDom: string): string | null {
    if (typeof DOMParser === "undefined") {
        return null;
    }

    const document = new DOMParser().parseFromString(blockDom, "text/html");
    return document.querySelector('[contenteditable="true"]')?.innerHTML ?? null;
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findMatchingClosingTag(
    html: string,
    tagName: string,
    startIndex: number
): number {
    const tagPattern = new RegExp(`<\\/?${escapeRegExp(tagName)}\\b[^>]*>`, "gi");
    tagPattern.lastIndex = startIndex;

    let depth = 1;
    let match: RegExpExecArray | null = null;
    while ((match = tagPattern.exec(html)) !== null) {
        const token = match[0];
        const isClosingTag = token.startsWith("</");
        const isSelfClosingTag = /\/>$/.test(token);

        if (isClosingTag) {
            depth -= 1;
        } else if (!isSelfClosingTag) {
            depth += 1;
        }

        if (depth === 0) {
            return match.index;
        }
    }

    return -1;
}

function extractEditableContentWithPattern(blockDom: string): string | null {
    const openTagPattern = /<([a-zA-Z0-9:-]+)\b[^>]*\bcontenteditable=(['"])true\2[^>]*>/i;
    const match = openTagPattern.exec(blockDom);
    if (!match || match.index < 0) {
        return null;
    }

    const tagName = match[1];
    const contentStart = match.index + match[0].length;
    const contentEnd = findMatchingClosingTag(blockDom, tagName, contentStart);
    if (contentEnd < 0) {
        return null;
    }

    return blockDom.slice(contentStart, contentEnd);
}

function resolveBlockDomRenderer(protyle: any): BlockDomRenderer | null {
    const renderer = protyle?.lute?.Md2BlockDOM;
    if (typeof renderer !== "function") {
        return null;
    }

    return (markdown: string) => renderer.call(protyle.lute, markdown);
}

function getEditableElement(blockElement: unknown): IContentEditableLike | null {
    const queryable = blockElement as IQueryRootLike | null;
    if (!queryable || typeof queryable.querySelector !== "function") {
        return null;
    }

    const editable = queryable.querySelector('[contenteditable="true"]') as
        | IContentEditableLike
        | null;

    if (!editable || typeof editable.innerHTML !== "string") {
        return null;
    }

    return editable;
}

export function extractEditableContentFromBlockDom(
    blockDom: string
): string | null {
    return (
        extractEditableContentWithDomParser(blockDom) ??
        extractEditableContentWithPattern(blockDom)
    );
}

export function renderHeadingMarkdownToHtmlContent(
    markdown: string,
    renderBlockDom: BlockDomRenderer
): string | null {
    if (typeof renderBlockDom !== "function") {
        return null;
    }

    const blockDom = renderBlockDom(markdown);
    if (typeof blockDom !== "string" || blockDom.length === 0) {
        return null;
    }

    return extractEditableContentFromBlockDom(blockDom);
}

export function syncLoadedHeadingMarkdownUpdates(
    protyle: any,
    updates: Record<string, string>
): number {
    const renderer = resolveBlockDomRenderer(protyle);
    const root = protyle?.wysiwyg?.element as IQueryRootLike | undefined;
    if (!renderer || !root || typeof root.querySelector !== "function") {
        return 0;
    }

    let syncedCount = 0;
    for (const [id, markdown] of Object.entries(updates)) {
        const blockElement = root.querySelector(`[data-node-id="${id}"]`);
        if (!blockElement) {
            continue;
        }

        const editable = getEditableElement(blockElement);
        if (!editable) {
            continue;
        }

        const htmlContent = renderHeadingMarkdownToHtmlContent(markdown, renderer);
        if (htmlContent === null) {
            continue;
        }

        editable.innerHTML = htmlContent;
        syncedCount += 1;
    }

    return syncedCount;
}
