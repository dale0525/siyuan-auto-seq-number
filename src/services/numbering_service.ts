import {
    clearAllHeadingNumbering,
    clearAutoNumbering,
    NumberingConfig,
    planHeadingUpdates,
} from "../numbering/numbering_engine";
import { SiyuanApi } from "../infra/siyuan_api";

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

export function createNumberingService(
    api: NumberingServiceApi,
    config: NumberingConfig
): NumberingService {
    async function updateDocument(docId: string): Promise<Record<string, string>> {
        await api.flushTransactions();
        const headings = await api.getDocHeadingBlocks(docId);
        const result = planHeadingUpdates(headings, config);
        await api.updateBlocks(result.updates, "markdown");
        return result.updates;
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
        await api.updateBlocks(result.updates, "markdown");
        return result.updates;
    }

    async function clearAllNumbering(docId: string): Promise<Record<string, string>> {
        await api.flushTransactions();
        const headings = await api.getDocHeadingBlocks(docId);
        const result = clearAllHeadingNumbering(headings);
        await api.updateBlocks(result.updates, "markdown");
        return result.updates;
    }

    return {
        updateDocument,
        clearDocument,
        clearAllNumbering,
    };
}
