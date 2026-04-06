export const AUTO_NUMBER_ATTR = "custom-auto-seq-number";
export const BACKUP_PREFIX_ATTR = "custom-auto-seq-number-backup-prefix";
export const CONTENT_DIGEST_ATTR = "custom-auto-seq-number-content-digest";

export interface NumberingState {
    number: string;
    backupPrefix: string;
    contentDigest: string;
}

export function normalizeStoredValue(value: unknown): string {
    return typeof value === "string" ? value : "";
}

export function computeContentDigest(content: string): string {
    let hash = 0x811c9dc5;

    for (const character of content) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 0x01000193);
    }

    return (hash >>> 0).toString(16).padStart(8, "0");
}

export function readNumberingState(
    attrs?: Record<string, string>
): NumberingState | null {
    if (!attrs) {
        return null;
    }

    const number = normalizeStoredValue(attrs[AUTO_NUMBER_ATTR]);
    const backupPrefix = normalizeStoredValue(attrs[BACKUP_PREFIX_ATTR]);
    const contentDigest = normalizeStoredValue(attrs[CONTENT_DIGEST_ATTR]);
    if (!number && !backupPrefix && !contentDigest) {
        return null;
    }

    return {
        number,
        backupPrefix,
        contentDigest,
    };
}

export function buildNumberingStateAttrs(
    state: NumberingState | null
): Record<string, string> {
    if (!state) {
        return {
            [AUTO_NUMBER_ATTR]: "",
            [BACKUP_PREFIX_ATTR]: "",
            [CONTENT_DIGEST_ATTR]: "",
        };
    }

    return {
        [AUTO_NUMBER_ATTR]: state.number,
        [BACKUP_PREFIX_ATTR]: state.backupPrefix,
        [CONTENT_DIGEST_ATTR]: state.contentDigest,
    };
}
