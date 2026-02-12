export interface ToggleNumberingService {
    updateDocument(docId: string): Promise<void>;
    clearDocument(
        docId: string,
        options: { preservePrefix: boolean }
    ): Promise<void>;
}

export interface ToggleNumberingInput {
    activeDocId: string | null;
    isEnabled: boolean;
    preservePrefixOnClear: boolean;
    service: ToggleNumberingService;
}

export type ToggleNumberingResult = "updated" | "cleared" | "noop";

export async function routeToggleNumbering(
    input: ToggleNumberingInput
): Promise<ToggleNumberingResult> {
    if (!input.activeDocId) {
        return "noop";
    }

    if (input.isEnabled) {
        await input.service.clearDocument(input.activeDocId, {
            preservePrefix: input.preservePrefixOnClear,
        });
        return "cleared";
    }

    await input.service.updateDocument(input.activeDocId);
    return "updated";
}
