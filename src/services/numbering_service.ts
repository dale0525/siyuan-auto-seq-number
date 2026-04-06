import {
    clearAllHeadingNumbering,
    clearAutoNumbering,
    HeadingBlock,
    NumberingConfig,
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
        result: {
            updates: Record<string, string>;
            attrs: Record<string, Record<string, string>>;
        }
    ): Promise<Record<string, string>> {
        const previousAttrs = buildPreviousNumberingAttrs(headings, result.attrs);

        try {
            await api.updateAttrs(result.attrs);
        } catch (error) {
            await rollbackAttrs(previousAttrs);
            throw error;
        }

        try {
            await api.updateBlocks(result.updates, "markdown");
        } catch (error) {
            await rollbackAttrs(previousAttrs);
            throw error;
        }

        return result.updates;
    }

    async function updateDocument(docId: string): Promise<Record<string, string>> {
        await api.flushTransactions();
        const headings = await api.getDocHeadingBlocks(docId);
        const result = planHeadingUpdates(headings, config);
        return applyNumberingPlan(headings, result);
    }

    async function clearDocument(
        docId: string,
        options: ClearDocumentOptions
    ): Promise<Record<string, string>> {
        await api.flushTransactions();
        const headings = await api.getDocHeadingBlocks(docId);
        const result = clearAutoNumbering(headings, {
            preservePrefix: options.preservePrefix,
        });
        return applyNumberingPlan(headings, result);
    }

    async function clearAllNumbering(docId: string): Promise<Record<string, string>> {
        await api.flushTransactions();
        const headings = await api.getDocHeadingBlocks(docId);
        const result = clearAllHeadingNumbering(headings);
        return applyNumberingPlan(headings, result);
    }

    return {
        updateDocument,
        clearDocument,
        clearAllNumbering,
    };
}
