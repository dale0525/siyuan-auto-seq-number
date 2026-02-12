export function resolveDocEnabled(
    docId: string | null,
    docEnableStatus: Record<string, boolean>,
    defaultEnabled: boolean
): boolean {
    if (!docId) {
        return defaultEnabled;
    }

    return docId in docEnableStatus ? docEnableStatus[docId] : defaultEnabled;
}
