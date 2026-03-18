export interface DynamicLoadingPolicy {
    useDocumentSourceWhenAvailable: boolean;
    allowLoadedDomFallback: boolean;
}

export function resolveDynamicLoadingPolicy(
    docId: string | null
): DynamicLoadingPolicy {
    if (docId) {
        return {
            useDocumentSourceWhenAvailable: true,
            allowLoadedDomFallback: false,
        };
    }

    return {
        useDocumentSourceWhenAvailable: false,
        allowLoadedDomFallback: true,
    };
}
