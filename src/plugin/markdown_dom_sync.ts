export type BlockDomRenderer = (markdown: string) => string;

interface IContentEditableLike {
    innerHTML: string;
}

interface IQueryRootLike {
    querySelector?: (selector: string) => unknown;
}

interface IBlockElementLike extends IQueryRootLike {
    getAttribute?: (name: string) => string | null;
}

interface ITransactionalEditorLike {
    updateBatchTransaction?: (
        nodeElements: Element[],
        cb: (element: HTMLElement) => void
    ) => void;
}

interface IRenderedHeadingUpdate {
    id: string;
    blockElement: IBlockElementLike;
    htmlContent: string;
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
    const openTagPattern =
        /<([a-zA-Z0-9:-]+)\b[^>]*\bcontenteditable=(['"])true\2[^>]*>/i;
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

function resolveCandidates(protyle: any): any[] {
    return [
        protyle,
        protyle?.protyle,
        protyle?.model?.editor,
        protyle?.model?.editor?.protyle,
    ].filter(Boolean);
}

function resolveBlockDomRenderer(protyle: any): BlockDomRenderer | null {
    for (const candidate of resolveCandidates(protyle)) {
        const renderer = candidate?.lute?.Md2BlockDOM;
        if (typeof renderer === "function") {
            return (markdown: string) => renderer.call(candidate.lute, markdown);
        }
    }

    return null;
}

function resolveWysiwygRoot(protyle: any): IQueryRootLike | null {
    for (const candidate of resolveCandidates(protyle)) {
        const root = candidate?.wysiwyg?.element as IQueryRootLike | undefined;
        if (root && typeof root.querySelector === "function") {
            return root;
        }
    }

    return null;
}

function resolveTransactionalEditor(
    protyle: any
): ITransactionalEditorLike | null {
    for (const candidate of resolveCandidates(protyle)) {
        if (typeof candidate?.updateBatchTransaction === "function") {
            return candidate as ITransactionalEditorLike;
        }
    }

    return null;
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

function collectRenderedHeadingUpdates(
    protyle: any,
    updates: Record<string, string>
): IRenderedHeadingUpdate[] {
    const renderer = resolveBlockDomRenderer(protyle);
    const root = resolveWysiwygRoot(protyle);
    if (!renderer || !root || typeof root.querySelector !== "function") {
        return [];
    }

    const renderedUpdates: IRenderedHeadingUpdate[] = [];
    for (const [id, markdown] of Object.entries(updates)) {
        const blockElement = root.querySelector(
            `[data-node-id="${id}"]`
        ) as IBlockElementLike | null;
        if (!blockElement) {
            continue;
        }

        const htmlContent = renderHeadingMarkdownToHtmlContent(markdown, renderer);
        if (htmlContent === null) {
            continue;
        }

        renderedUpdates.push({
            id,
            blockElement,
            htmlContent,
        });
    }

    return renderedUpdates;
}

function applyDirectDomUpdates(renderedUpdates: IRenderedHeadingUpdate[]): number {
    let syncedCount = 0;
    for (const renderedUpdate of renderedUpdates) {
        const editable = getEditableElement(renderedUpdate.blockElement);
        if (!editable) {
            continue;
        }

        editable.innerHTML = renderedUpdate.htmlContent;
        syncedCount += 1;
    }

    return syncedCount;
}

function applyBatchTransactionUpdates(
    editor: ITransactionalEditorLike,
    renderedUpdates: IRenderedHeadingUpdate[]
): number {
    const htmlContentById = new Map(
        renderedUpdates.map((renderedUpdate) => [
            renderedUpdate.id,
            renderedUpdate.htmlContent,
        ])
    );
    const nodeElements = renderedUpdates.map(
        (renderedUpdate) => renderedUpdate.blockElement as unknown as Element
    );

    editor.updateBatchTransaction?.(nodeElements, (element: HTMLElement) => {
        const blockId = element.getAttribute("data-node-id");
        if (!blockId) {
            return;
        }

        const htmlContent = htmlContentById.get(blockId);
        if (!htmlContent) {
            return;
        }

        const editable = getEditableElement(element);
        if (!editable) {
            return;
        }

        editable.innerHTML = htmlContent;
    });

    return nodeElements.length;
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
    const renderedUpdates = collectRenderedHeadingUpdates(protyle, updates);
    if (renderedUpdates.length === 0) {
        return 0;
    }

    const editor = resolveTransactionalEditor(protyle);
    if (editor) {
        return applyBatchTransactionUpdates(editor, renderedUpdates);
    }

    return applyDirectDomUpdates(renderedUpdates);
}
