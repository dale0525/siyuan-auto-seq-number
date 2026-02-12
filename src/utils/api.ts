import { createSiyuanApi } from "../infra/siyuan_api";

const siyuanApi = createSiyuanApi();

/**
 * 批量更新块内容
 * @param contents 块 ID 到内容的映射
 * @param dataType 块数据格式，可以是 "dom" 或 "markdown"
 */
export async function batchUpdateBlockContent(
    contents: Record<string, string>,
    dataType: "dom" | "markdown" = "dom"
): Promise<void> {
    await siyuanApi.updateBlocks(contents, dataType);
}
