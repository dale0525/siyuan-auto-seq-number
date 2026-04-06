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
    ial?: string;
}

interface IHeadingAttrsPayload {
    [key: string]: string;
}

const ATTR_UPDATE_CONCURRENCY = 8;

export interface SiyuanApi {
    getVersion(): Promise<string>;
    flushTransactions(): Promise<void>;
    getDocHeadingBlocks(docId: string): Promise<HeadingBlock[]>;
    updateBlocks(
        updates: Record<string, string>,
        dataType: BlockDataType
    ): Promise<void>;
    updateAttrs(attrs: Record<string, Record<string, string>>): Promise<void>;
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
        const sql = `select id, markdown, subtype, ial from blocks where root_id = '${escapedDocId}' and subtype in ('h1','h2','h3','h4','h5','h6') order by sort asc`;
        const rows = await requestApi<ISqlHeadingRow[]>(fetchImpl, "/api/query/sql", {
            stmt: sql,
        });

        return rows
            .filter((row) => typeof row.id === "string")
            .map((row) => ({
                id: row.id,
                markdown: row.markdown || "",
                subtype: row.subtype || "",
                attrs: parseInlineAttrs(row.ial),
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

    async function updateAttrs(
        attrs: Record<string, Record<string, string>>
    ): Promise<void> {
        await updateAttrsBatch(fetchImpl, attrs);
    }

    return {
        getVersion,
        flushTransactions,
        getDocHeadingBlocks,
        updateBlocks,
        updateAttrs,
    };
}
