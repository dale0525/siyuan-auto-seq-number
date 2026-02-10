/**
 * 思源笔记API工具函数
 */

interface IApiResponse<T> {
    code: number;
    msg: string;
    data: T;
}

export interface IDocHeadingBlock {
    id: string;
    markdown: string;
    subtype: string;
}

async function postApi<T>(url: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`请求失败: ${url}`);
    }

    const result = (await response.json()) as IApiResponse<T>;
    if (result.code !== 0) {
        throw new Error(result.msg || `接口返回错误: ${url}`);
    }

    return result.data;
}

function escapeSqlValue(value: string): string {
    return value.replace(/'/g, "''");
}

/**
 * 获取文档中的全部标题块（不依赖当前是否懒加载到DOM）
 */
export async function getDocHeadingBlocks(docId: string): Promise<IDocHeadingBlock[]> {
    const safeDocId = escapeSqlValue(docId);
    const stmt =
        "SELECT id, markdown, subtype FROM blocks " +
        `WHERE root_id = '${safeDocId}' AND type = 'h' ORDER BY sort ASC`;

    const data = await postApi<
        Array<Partial<IDocHeadingBlock> & { id?: string; markdown?: string; subtype?: string }>
    >("/api/query/sql", { stmt });

    return data
        .filter((row) => {
            return (
                typeof row.id === "string" &&
                typeof row.markdown === "string" &&
                typeof row.subtype === "string"
            );
        })
        .map((row) => {
            return {
                id: row.id as string,
                markdown: row.markdown as string,
                subtype: row.subtype as string,
            };
        });
}

/**
 * 批量更新块内容
 * @param contents 块ID到内容的映射
 * @param dataType 块数据格式，可以是 "dom" 或 "markdown"
 */
export async function batchUpdateBlockContent(
    contents: Record<string, string>,
    dataType: "dom" | "markdown" = "dom",
    useBulkApi = false
): Promise<void> {
    if (useBulkApi) {
        const toUpdateList = Object.entries(contents).map(([id, content]) => {
            return {
                id,
                data: content,
                dataType,
            };
        });
        return fetch("/api/block/batchUpdateBlock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                blocks: toUpdateList,
            }),
        }).then(async response => {
            if (!response.ok) {
                throw new Error("更新失败");
            }
            return response.json();
        });
    }
    else {
        // 为每个块创建独立的更新请求
        const updatePromises = Object.entries(contents).map(([id, content]) => {
            return fetch("/api/block/updateBlock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    data: content,
                    dataType,
                }),
            }).then(async response => {
                if (!response.ok) {
                    throw new Error(`更新块 ${id} 失败`);
                }
                return response.json();
            });
        });

        try {
            // 并行执行所有更新请求
            await Promise.all(updatePromises);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "未知错误";
            throw new Error(`批量更新块内容失败: ${errorMessage}`);
        }
    }
}

export async function getVersion(): Promise<string> {
    return fetch("/api/system/version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    }).then(async response => {
        if (!response.ok) {
            throw new Error("获取版本号失败");
        }
        const data = await response.json();
        return data.data;
    });
}
