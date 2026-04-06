export const AUTO_NUMBER_ATTR = "custom-auto-seq-number";
export const BACKUP_PREFIX_ATTR = "custom-auto-seq-number-backup-prefix";

export interface NumberingState {
    number: string;
    backupPrefix: string;
}

export function normalizeStoredValue(value: unknown): string {
    return typeof value === "string" ? value : "";
}

export function readNumberingState(
    attrs?: Record<string, string>
): NumberingState | null {
    if (!attrs) {
        return null;
    }

    const number = normalizeStoredValue(attrs[AUTO_NUMBER_ATTR]);
    const backupPrefix = normalizeStoredValue(attrs[BACKUP_PREFIX_ATTR]);
    if (!number && !backupPrefix) {
        return null;
    }

    return {
        number,
        backupPrefix,
    };
}

export function buildNumberingStateAttrs(
    state: NumberingState | null
): Record<string, string> {
    if (!state) {
        return {
            [AUTO_NUMBER_ATTR]: "",
            [BACKUP_PREFIX_ATTR]: "",
        };
    }

    return {
        [AUTO_NUMBER_ATTR]: state.number,
        [BACKUP_PREFIX_ATTR]: state.backupPrefix,
    };
}
