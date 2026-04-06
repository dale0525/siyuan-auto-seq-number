import {
    clearAllHeadingNumbering,
    clearAutoNumbering,
    HeadingBlock,
    NumberingConfig,
    NumberingPlanResult,
    NumberingStateStorage,
    planHeadingUpdates,
} from "../numbering/numbering_engine";
import { SiyuanApi } from "../infra/siyuan_api";
import {
    buildNumberingStateAttrs,
    readNumberingState,
} from "../numbering/numbering_state";

export type NumberingServiceApi = SiyuanApi;

export interface ClearDocumentOptions {
    preservePrefix: boolean;
}

export interface NumberingService {
    updateDocument(docId: string): Promise<Record<string, string>>;
    clearDocument(
        docId: string,
        options: ClearDocumentOptions
    ): Promise<Record<string, string>>;
    clearAllNumbering(docId: string): Promise<Record<string, string>>;
}

interface ApplyPlanFallbackOptions {
    unsupportedAttrFallback?: (
        initialPlan: NumberingPlanResult
    ) => NumberingPlanResult;
}

function buildPreviousNumberingAttrs(
    headings: HeadingBlock[],
    nextAttrs: Record<string, Record<string, string>>
): Record<string, Record<string, string>> {
    const headingById = new Map(headings.map((heading) => [heading.id, heading]));
    const previousAttrs: Record<string, Record<string, string>> = {};

    for (const id of Object.keys(nextAttrs)) {
        const previousState = readNumberingState(headingById.get(id)?.attrs);
        previousAttrs[id] = buildNumberingStateAttrs(previousState);
    }

    return previousAttrs;
}

function hasReadableStoredState(headings: HeadingBlock[]): boolean {
    return headings.some((heading) => readNumberingState(heading.attrs));
}

export function createNumberingService(
    api: NumberingServiceApi,
    config: NumberingConfig
): NumberingService {
    async function rollbackAttrs(
        attrs: Record<string, Record<string, string>>
    ): Promise<void> {
        try {
            await api.updateAttrs(attrs);
        } catch {
            // Best-effort rollback to reduce mismatched attrs/content state.
        }
    }

    async function applyNumberingPlan(
        headings: HeadingBlock[],
        result: NumberingPlanResult,
        stateStorage: NumberingStateStorage
    ): Promise<Record<string, string>> {
        if (stateStorage === "marker") {
            await api.updateBlocks(result.updates, "markdown");
            return result.updates;
        }

        if (
            Object.keys(result.updates).length === 0 &&
            Object.keys(result.attrs).length === 0
        ) {
            return result.updates;
        }

        const previousAttrs = buildPreviousNumberingAttrs(headings, result.attrs);

        if (Object.keys(result.attrs).length > 0) {
            try {
                await api.updateAttrs(result.attrs);
            } catch (error) {
                if (api.supportsAttributeNumberingState()) {
                    await rollbackAttrs(previousAttrs);
                }
                throw error;
            }
        }

        try {
            await api.updateBlocks(result.updates, "markdown");
        } catch (error) {
            await rollbackAttrs(previousAttrs);
            throw error;
        }

        return result.updates;
    }

    async function applyPlanWithFallback(
        headings: HeadingBlock[],
        buildPlan: (stateStorage: NumberingStateStorage) => NumberingPlanResult,
        options?: ApplyPlanFallbackOptions
    ): Promise<Record<string, string>> {
        const initialStorage =
            hasReadableStoredState(headings) || api.supportsAttributeNumberingState()
            ? "attrs"
            : "marker";
        const initialPlan = buildPlan(initialStorage);

        try {
            return await applyNumberingPlan(headings, initialPlan, initialStorage);
        } catch (error) {
            if (initialStorage === "attrs" && !api.supportsAttributeNumberingState()) {
                const fallbackPlan =
                    options?.unsupportedAttrFallback?.(initialPlan) ||
                    buildPlan("marker");
                return applyNumberingPlan(headings, fallbackPlan, "marker");
            }

            throw error;
        }
    }

    async function updateDocument(docId: string): Promise<Record<string, string>> {
        await api.flushTransactions();
        const headings = await api.getDocHeadingBlocks(docId);
        return applyPlanWithFallback(headings, (stateStorage) =>
            planHeadingUpdates(headings, config, { stateStorage })
        );
    }

    async function clearDocument(
        docId: string,
        options: ClearDocumentOptions
    ): Promise<Record<string, string>> {
        await api.flushTransactions();
        const headings = await api.getDocHeadingBlocks(docId);
        return applyPlanWithFallback(headings, (stateStorage) =>
            clearAutoNumbering(
                headings,
                {
                    preservePrefix: options.preservePrefix,
                },
                { stateStorage }
            ),
            {
                unsupportedAttrFallback(initialPlan) {
                    return {
                        updates: initialPlan.updates,
                        attrs: {},
                    };
                },
            }
        );
    }

    async function clearAllNumbering(docId: string): Promise<Record<string, string>> {
        await api.flushTransactions();
        const headings = await api.getDocHeadingBlocks(docId);
        return applyPlanWithFallback(headings, (stateStorage) =>
            clearAllHeadingNumbering(headings, { stateStorage })
        );
    }

    return {
        updateDocument,
        clearDocument,
        clearAllNumbering,
    };
}
