/**
 * 标题块缓存类
 * 用于缓存文档中的标题块信息，减少API调用次数
 */
export declare class HeaderCache {
    private documentHeaders;
    private blockAttrs;
    private blockLevels;
    /**
     * 设置文档的标题块列表
     * @param docId 文档ID
     * @param headers 标题块ID列表
     */
    setDocumentHeaders(docId: string, headers: string[]): void;
    /**
     * 获取文档的标题块列表
     * @param docId 文档ID
     * @returns 标题块ID列表，如果不存在则返回空数组
     */
    getDocumentHeaders(docId: string): string[];
    /**
     * 检查文档是否有缓存的标题块列表
     * @param docId 文档ID
     * @returns 是否有缓存
     */
    hasDocumentHeaders(docId: string): boolean;
    /**
     * 缓存块属性
     * @param blockId 块ID
     * @param attrs 块属性
     */
    setBlockAttrs(blockId: string, attrs: any): void;
    /**
     * 批量缓存块属性
     * @param attrsMap 块ID与属性的映射
     */
    batchSetBlockAttrs(attrsMap: Map<string, any>): void;
    /**
     * 获取块属性
     * @param blockId 块ID
     * @returns 块属性，如果不存在则返回null
     */
    getBlockAttrs(blockId: string): any;
    /**
     * 设置块级别
     * @param blockId 块ID
     * @param level 块级别
     */
    setBlockLevel(blockId: string, level: number): void;
    /**
     * 批量设置块级别
     * @param levelMap 块ID与级别的映射
     */
    batchSetBlockLevels(levelMap: Map<string, number>): void;
    /**
     * 获取块级别
     * @param blockId 块ID
     * @returns 块级别，如果不存在则返回0
     */
    getBlockLevel(blockId: string): number;
    /**
     * 清除文档的所有缓存
     * @param docId 文档ID
     */
    clearDocumentCache(docId: string): void;
    /**
     * 清除特定块的缓存
     * @param blockId 块ID
     */
    clearBlockCache(blockId: string): void;
    /**
     * 清除所有缓存
     */
    clearAll(): void;
}
export declare const headerCache: HeaderCache;
