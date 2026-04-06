export interface DynamicLoadingPolicy {
    useDocumentSourceWhenAvailable: boolean;
    allowLoadedDomFallbackForUpdate: boolean;
    allowLoadedDomFallbackForClear: boolean;
    allowLoadedDomFallbackForClearAll: boolean;
}

export function resolveDynamicLoadingPolicy(
    docId: string | null
): DynamicLoadingPolicy {
    if (docId) {
        return {
            useDocumentSourceWhenAvailable: true,
            allowLoadedDomFallbackForUpdate: false,
            allowLoadedDomFallbackForClear: true,
            allowLoadedDomFallbackForClearAll: true,
        };
    }

    return {
        useDocumentSourceWhenAvailable: false,
        allowLoadedDomFallbackForUpdate: true,
        allowLoadedDomFallbackForClear: true,
        allowLoadedDomFallbackForClearAll: true,
    };
}
