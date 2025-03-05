/**
 * 思源笔记API工具函数
 */
/**
 * 批量获取块属性
 * @param blockIds 块ID数组
 * @returns 块属性映射表
 */
export async function batchGetBlockAttrs(blockIds) {
    const response = await fetch('/api/attr/getBlockAttrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: blockIds
        })
    });
    if (!response.ok) {
        throw new Error('获取块属性失败');
    }
    const result = await response.json();
    return result.data;
}
/**
 * 批量设置块属性
 * @param attrs 块ID到属性的映射
 */
export async function batchSetBlockAttrs(attrs) {
    const response = await fetch('/api/attr/setBlockAttrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            attrs
        })
    });
    if (!response.ok) {
        throw new Error('设置块属性失败');
    }
}
/**
 * 批量获取块内容
 * @param blockIds 块ID数组
 * @returns 块内容映射表
 */
export async function batchGetBlockContent(blockIds) {
    const response = await fetch('/api/block/getBlockContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: blockIds
        })
    });
    if (!response.ok) {
        throw new Error('获取块内容失败');
    }
    const result = await response.json();
    return result.data;
}
/**
 * 批量更新块内容
 * @param contents 块ID到内容的映射
 */
export async function batchUpdateBlockContent(contents) {
    const operations = Object.entries(contents).map(([id, content]) => ({
        action: 'update',
        id,
        data: content
    }));
    const response = await fetch('/api/block/updateBlocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            operations
        })
    });
    if (!response.ok) {
        throw new Error('更新块内容失败');
    }
}
/**
 * 获取文档大纲
 * @param docId 文档ID
 * @returns 大纲数据
 */
export async function getDocumentOutline(docId) {
    const response = await fetch('/api/outline/getDocOutline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: docId
        })
    });
    if (!response.ok) {
        throw new Error('获取文档大纲失败');
    }
    const result = await response.json();
    return result.data;
}
/**
 * 获取文档块树
 * @param docId 文档ID
 * @returns 块树数据
 */
export async function getDocumentBlockTree(docId) {
    const response = await fetch('/api/block/getBlockTree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: docId
        })
    });
    if (!response.ok) {
        throw new Error('获取文档块树失败');
    }
    const result = await response.json();
    return result.data;
}
//# sourceMappingURL=api.js.map