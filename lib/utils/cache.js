/**
 * 标题块缓存类
 * 用于缓存文档中的标题块信息，减少API调用次数
 */
export class HeaderCache {
    constructor() {
        // 文档ID -> 块ID列表的映射
        this.documentHeaders = new Map();
        // 块ID -> 块属性的映射
        this.blockAttrs = new Map();
        // 块ID -> 块级别的映射
        this.blockLevels = new Map();
    }
    /**
     * 设置文档的标题块列表
     * @param docId 文档ID
     * @param headers 标题块ID列表
     */
    setDocumentHeaders(docId, headers) {
        this.documentHeaders.set(docId, [...headers]);
    }
    /**
     * 获取文档的标题块列表
     * @param docId 文档ID
     * @returns 标题块ID列表，如果不存在则返回空数组
     */
    getDocumentHeaders(docId) {
        return this.documentHeaders.get(docId) || [];
    }
    /**
     * 检查文档是否有缓存的标题块列表
     * @param docId 文档ID
     * @returns 是否有缓存
     */
    hasDocumentHeaders(docId) {
        return this.documentHeaders.has(docId);
    }
    /**
     * 缓存块属性
     * @param blockId 块ID
     * @param attrs 块属性
     */
    setBlockAttrs(blockId, attrs) {
        this.blockAttrs.set(blockId, attrs);
    }
    /**
     * 批量缓存块属性
     * @param attrsMap 块ID与属性的映射
     */
    batchSetBlockAttrs(attrsMap) {
        for (const [blockId, attrs] of attrsMap.entries()) {
            this.blockAttrs.set(blockId, attrs);
        }
    }
    /**
     * 获取块属性
     * @param blockId 块ID
     * @returns 块属性，如果不存在则返回null
     */
    getBlockAttrs(blockId) {
        return this.blockAttrs.get(blockId) || null;
    }
    /**
     * 设置块级别
     * @param blockId 块ID
     * @param level 块级别
     */
    setBlockLevel(blockId, level) {
        this.blockLevels.set(blockId, level);
    }
    /**
     * 批量设置块级别
     * @param levelMap 块ID与级别的映射
     */
    batchSetBlockLevels(levelMap) {
        for (const [blockId, level] of levelMap.entries()) {
            this.blockLevels.set(blockId, level);
        }
    }
    /**
     * 获取块级别
     * @param blockId 块ID
     * @returns 块级别，如果不存在则返回0
     */
    getBlockLevel(blockId) {
        return this.blockLevels.get(blockId) || 0;
    }
    /**
     * 清除文档的所有缓存
     * @param docId 文档ID
     */
    clearDocumentCache(docId) {
        const headers = this.getDocumentHeaders(docId);
        for (const blockId of headers) {
            this.blockAttrs.delete(blockId);
            this.blockLevels.delete(blockId);
        }
        this.documentHeaders.delete(docId);
    }
    /**
     * 清除特定块的缓存
     * @param blockId 块ID
     */
    clearBlockCache(blockId) {
        this.blockAttrs.delete(blockId);
        this.blockLevels.delete(blockId);
        // 也从文档头部列表中移除
        for (const [docId, headers] of this.documentHeaders.entries()) {
            const index = headers.indexOf(blockId);
            if (index !== -1) {
                headers.splice(index, 1);
                this.documentHeaders.set(docId, headers);
                break;
            }
        }
    }
    /**
     * 清除所有缓存
     */
    clearAll() {
        this.documentHeaders.clear();
        this.blockAttrs.clear();
        this.blockLevels.clear();
    }
}
// 全局缓存实例
export const headerCache = new HeaderCache();
//# sourceMappingURL=cache.js.map