function readString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
}

export function resolveDocId(protyle: unknown): string | null {
    const record = (protyle || {}) as Record<string, unknown>;
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
