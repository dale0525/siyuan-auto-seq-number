/**
 * 思源笔记API工具函数
 */

/**
 * 批量更新块内容
 * @param contents 块ID到内容的映射
 * @param dataType 块数据格式，可以是 "dom" 或 "markdown"
 */
export async function batchUpdateBlockContent(
    contents: Record<string, string>, 
    dataType: "dom" | "markdown" = "dom"
): Promise<void> {
    // 为每个块创建独立的更新请求
    const updatePromises = Object.entries(contents).map(([id, content]) => {
        return fetch('/api/block/updateBlock', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                id,
                data: content,
                dataType
            })
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
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        throw new Error(`批量更新块内容失败: ${errorMessage}`);
    }
}