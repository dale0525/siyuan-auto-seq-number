function readString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
}

function readRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {};
}

function readDocIdFromCandidate(candidate: unknown): string | null {
    const record = readRecord(candidate);
    const background = (record.background || {}) as Record<string, unknown>;
    const ial = (background.ial || {}) as Record<string, unknown>;
    const block = (record.block || {}) as Record<string, unknown>;
    const options = (record.options || {}) as Record<string, unknown>;

    return (
        readString(ial.id) ||
        readString(block.rootID) ||
        readString(block.id) ||
        readString(options.blockId) ||
        null
    );
}

function resolveCandidates(protyle: unknown): unknown[] {
    const record = readRecord(protyle);
    const model = readRecord(record.model);
    const editor = readRecord(model.editor);

    return [record, record.protyle, editor, editor.protyle].filter(Boolean);
}

export function resolveDocId(protyle: unknown): string | null {
    for (const candidate of resolveCandidates(protyle)) {
        const docId = readDocIdFromCandidate(candidate);
        if (docId) {
            return docId;
        }
    }

    return null;
}
