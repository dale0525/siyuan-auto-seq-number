import { HeadingBlock } from "../numbering/numbering_engine";

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
}

interface IBlockKramdownData {
    id: string;
    kramdown: string;
}

export interface SiyuanApi {
    getVersion(): Promise<string>;
    flushTransactions(): Promise<void>;
    getDocHeadingBlocks(docId: string): Promise<HeadingBlock[]>;
    updateBlocks(
        updates: Record<string, string>,
        dataType: BlockDataType
    ): Promise<void>;
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
        throw new Error(`SiYuan API request failed: ${path}`);
    }

    const json = (await response.json()) as ISiyuanApiResponse<T>;
    if (json.code !== 0) {
        throw new Error(`SiYuan API returned error: ${path} ${json.msg}`);
    }
    return json.data;
}

function escapeSqlString(value: string): string {
    return value.replace(/'/g, "''");
}

async function updateBlocksBatch(
    fetchImpl: typeof fetch,
    updates: Record<string, string>,
    dataType: BlockDataType
): Promise<void> {
    const data = Object.entries(updates).map(([id, content]) => ({
        id,
        data: content,
    }));

    await requestApi<unknown>(fetchImpl, "/api/block/batchUpdateBlock", {
        dataType,
        data,
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
        const escapedDocId = escapeSqlString(docId);
        const sql = `select id, markdown, subtype from blocks where root_id = '${escapedDocId}' and subtype in ('h1','h2','h3','h4','h5','h6') order by sort asc`;
        const rows = await requestApi<ISqlHeadingRow[]>(fetchImpl, "/api/query/sql", {
            stmt: sql,
        });

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
            }));
    }

    async function updateBlocks(
        updates: Record<string, string>,
        dataType: BlockDataType
    ): Promise<void> {
        if (Object.keys(updates).length === 0) {
            return;
        }

        await updateBlocksBatch(fetchImpl, updates, dataType);
    }

    return {
        getVersion,
        flushTransactions,
        getDocHeadingBlocks,
        updateBlocks,
    };
}
