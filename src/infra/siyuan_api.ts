import { HeadingBlock } from "../numbering/numbering_engine";
import { compareVersion } from "../utils/version_utils";

type BlockDataType = "markdown" | "dom";

interface ISiyuanApiResponse<T> {
    code: number;
    msg: string;
    data: T;
}

interface ISqlHeadingRow {
    id: string;
    markdown: string;
    subtype: string;
    ial?: string;
}

interface IBlockKramdownData {
    id: string;
    kramdown: string;
}

interface IHeadingAttrsPayload {
    [key: string]: string;
}

class SiyuanApiRequestError extends Error {
    path: string;
    status: number;
    code: number | null;
    apiMessage: string;

    constructor(
        path: string,
        message: string,
        status: number,
        code: number | null = null,
        apiMessage = ""
    ) {
        super(message);
        this.name = "SiyuanApiRequestError";
        this.path = path;
        this.status = status;
        this.code = code;
        this.apiMessage = apiMessage;
    }
}

const ATTR_UPDATE_CONCURRENCY = 8;
export const MIN_MARKDOWN_BATCH_UPDATE_APP_VERSION = "3.1.25";

function buildUnsupportedMarkdownBatchVersionError(version: string): Error {
    return new Error(
        `Markdown batch updates require SiYuan >= ${MIN_MARKDOWN_BATCH_UPDATE_APP_VERSION}, received ${version}.`
    );
}

export interface SiyuanApi {
    getVersion(): Promise<string>;
    flushTransactions(): Promise<void>;
    getDocHeadingBlocks(docId: string): Promise<HeadingBlock[]>;
    updateBlocks(
        updates: Record<string, string>,
        dataType: BlockDataType
    ): Promise<void>;
    updateAttrs(attrs: Record<string, Record<string, string>>): Promise<void>;
    supportsAttributeNumberingState(): boolean;
}

async function requestApi<T>(
    fetchImpl: typeof fetch,
    path: string,
    payload?: unknown
): Promise<T> {
    const response = await fetchImpl(path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload ?? {}),
    });

    if (!response.ok) {
        throw new SiyuanApiRequestError(
            path,
            `SiYuan API request failed: ${path}`,
            response.status
        );
    }

    const json = (await response.json()) as ISiyuanApiResponse<T>;
    if (json.code !== 0) {
        throw new SiyuanApiRequestError(
            path,
            `SiYuan API returned error: ${path} ${json.msg}`,
            response.status,
            json.code,
            json.msg
        );
    }
    return json.data;
}

function escapeSqlString(value: string): string {
    return value.replace(/'/g, "''");
}

function parseInlineAttrs(ial: string | undefined): Record<string, string> {
    if (!ial || typeof ial !== "string") {
        return {};
    }

    const attrs: Record<string, string> = {};
    const attrMatches = ial.match(/\{:[^}]*\}/);
    const content = attrMatches?.[0] || ial;
    const regex = /([\w-]+)=\"([^\"]*)\"/g;
    let match: RegExpExecArray | null = regex.exec(content);
    while (match) {
        attrs[match[1]] = match[2];
        match = regex.exec(content);
    }

    return attrs;
}

function isIalColumnUnsupported(error: unknown): boolean {
    return (
        error instanceof SiyuanApiRequestError &&
        error.path === "/api/query/sql" &&
        /ial/i.test(error.apiMessage)
    );
}

function isAttrEndpointUnsupported(error: unknown): boolean {
    return (
        error instanceof SiyuanApiRequestError &&
        error.path === "/api/attr/setBlockAttrs" &&
        (error.status === 404 ||
            /unsupported|not found|unrecognized|no such (api|endpoint|route)/i.test(
                error.apiMessage
            ))
    );
}

async function updateBlocksBatch(
    fetchImpl: typeof fetch,
    updates: Record<string, string>,
    dataType: BlockDataType
): Promise<void> {
    const blocks = Object.entries(updates).map(([id, content]) => ({
        id,
        data: content,
        dataType,
    }));

    await requestApi<unknown>(fetchImpl, "/api/block/batchUpdateBlock", {
        blocks,
    });
}

async function updateAttrsBatch(
    fetchImpl: typeof fetch,
    attrs: Record<string, Record<string, string>>
): Promise<void> {
    const entries = Object.entries(attrs);
    if (entries.length === 0) {
        return;
    }

    for (
        let startIndex = 0;
        startIndex < entries.length;
        startIndex += ATTR_UPDATE_CONCURRENCY
    ) {
        const batch = entries.slice(startIndex, startIndex + ATTR_UPDATE_CONCURRENCY);
        const results = await Promise.allSettled(
            batch.map(([id, blockAttrs]) =>
                requestApi<unknown>(fetchImpl, "/api/attr/setBlockAttrs", {
                    id,
                    attrs: blockAttrs as IHeadingAttrsPayload,
                })
            )
        );

        const rejected = results.find(
            (result): result is PromiseRejectedResult => result.status === "rejected"
        );
        if (rejected) {
            throw rejected.reason;
        }
    }
}

async function queryDocHeadingRows(
    fetchImpl: typeof fetch,
    docId: string,
    includeIal: boolean
): Promise<ISqlHeadingRow[]> {
    const escapedDocId = escapeSqlString(docId);
    const columns = includeIal ? "id, markdown, subtype, ial" : "id, markdown, subtype";
    const sql = `select ${columns} from blocks where root_id = '${escapedDocId}' and subtype in ('h1','h2','h3','h4','h5','h6') order by sort asc`;

    return requestApi<ISqlHeadingRow[]>(fetchImpl, "/api/query/sql", {
        stmt: sql,
    });
}

function reorderHeadingRowsByKramdown(
    rows: ISqlHeadingRow[],
    kramdown: string
): ISqlHeadingRow[] {
    if (!kramdown) {
        return rows;
    }

    const orderedIds: string[] = [];
    const lines = kramdown.split(/\r?\n/u);

    for (let index = 0; index < lines.length - 1; index++) {
        const currentLine = lines[index];
        const nextLine = lines[index + 1];

        if (!/^#{1,6}\s+/u.test(currentLine)) {
            continue;
        }

        const idMatch = nextLine.match(/^\{:[^\n]*\bid="([^"]+)"/u);
        if (!idMatch) {
            continue;
        }

        orderedIds.push(idMatch[1]);
    }

    if (orderedIds.length === 0) {
        return rows;
    }

    const rowById = new Map(rows.map((row) => [row.id, row]));
    const orderedRows: ISqlHeadingRow[] = [];

    for (const id of orderedIds) {
        const row = rowById.get(id);
        if (!row) {
            continue;
        }
        orderedRows.push(row);
        rowById.delete(id);
    }

    return [...orderedRows, ...rowById.values()];
}

export function createSiyuanApi(fetchImpl: typeof fetch = fetch): SiyuanApi {
    let versionCache: string | null = null;
    let canReadAttributeState = true;
    let canWriteAttributeState = true;

    async function getVersion(): Promise<string> {
        if (versionCache) {
            return versionCache;
        }
        versionCache = await requestApi<string>(fetchImpl, "/api/system/version");
        return versionCache;
    }

    async function flushTransactions(): Promise<void> {
        try {
            await requestApi<unknown>(fetchImpl, "/api/sqlite/flushTransaction");
        } catch {
            // Keep update flow working on versions/environments without this endpoint.
        }
    }

    async function getDocHeadingBlocks(docId: string): Promise<HeadingBlock[]> {
        let rows: ISqlHeadingRow[];

        if (canReadAttributeState) {
            try {
                rows = await queryDocHeadingRows(fetchImpl, docId, true);
            } catch (error) {
                if (!isIalColumnUnsupported(error)) {
                    throw error;
                }
                canReadAttributeState = false;
                canWriteAttributeState = false;
                rows = await queryDocHeadingRows(fetchImpl, docId, false);
            }
        } else {
            rows = await queryDocHeadingRows(fetchImpl, docId, false);
        }

        let orderedRows = rows;
        try {
            const kramdownData = await requestApi<IBlockKramdownData>(
                fetchImpl,
                "/api/block/getBlockKramdown",
                {
                    id: docId,
                }
            );
            orderedRows = reorderHeadingRowsByKramdown(
                rows,
                kramdownData.kramdown || ""
            );
        } catch {
            // Fall back to SQL order on versions/environments without kramdown support.
        }

        return orderedRows
            .filter((row) => typeof row.id === "string")
            .map((row) => ({
                id: row.id,
                markdown: row.markdown || "",
                subtype: row.subtype || "",
                attrs: canReadAttributeState ? parseInlineAttrs(row.ial) : {},
            }));
    }

    async function updateBlocks(
        updates: Record<string, string>,
        dataType: BlockDataType
    ): Promise<void> {
        if (Object.keys(updates).length === 0) {
            return;
        }

        if (dataType === "markdown") {
            const version = await getVersion();
            if (
                compareVersion(
                    version,
                    MIN_MARKDOWN_BATCH_UPDATE_APP_VERSION
                ) < 0
            ) {
                throw buildUnsupportedMarkdownBatchVersionError(version);
            }
        }

        await updateBlocksBatch(fetchImpl, updates, dataType);
    }

    async function updateAttrs(
        attrs: Record<string, Record<string, string>>
    ): Promise<void> {
        if (!canWriteAttributeState || Object.keys(attrs).length === 0) {
            return;
        }

        try {
            await updateAttrsBatch(fetchImpl, attrs);
        } catch (error) {
            if (isAttrEndpointUnsupported(error)) {
                canWriteAttributeState = false;
            }
            throw error;
        }
    }

    function supportsAttributeNumberingState(): boolean {
        return canReadAttributeState && canWriteAttributeState;
    }

    return {
        getVersion,
        flushTransactions,
        getDocHeadingBlocks,
        updateBlocks,
        updateAttrs,
        supportsAttributeNumberingState,
    };
}
