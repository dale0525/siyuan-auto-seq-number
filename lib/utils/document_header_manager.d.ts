/**
 * 文档标题管理器
 * 用于管理文档中的标题信息，替代依赖block属性的方式
 */
export declare class DocumentHeaderManager {
    private documentHeaders;
    /**
     * 获取所有文档的标题信息
     * @returns 文档ID和标题信息的Map
     */
    getAllDocumentHeaders(): Map<string, DocumentHeaders>;
    /**
     * 初始化或获取文档的标题信息
     * @param docId 文档ID
     * @returns 文档标题信息对象
     */
    getDocumentHeaders(docId: string): DocumentHeaders;
    /**
     * 检查文档是否有标题信息
     * @param docId 文档ID
     * @returns 是否有标题信息
     */
    hasDocumentHeaders(docId: string): boolean;
    /**
     * 清除文档的标题信息
     * @param docId 文档ID
     */
    clearDocumentHeaders(docId: string): void;
    /**
     * 清除所有文档的标题信息
     */
    clearAll(): void;
}
/**
 * 文档标题信息类
 * 存储文档中所有标题的信息
 */
export declare class DocumentHeaders {
    private headerIds;
    private headerInfoMap;
    private _hasNumbering;
    /**
     * 获取文档是否已添加序号
     */
    get hasNumbering(): boolean;
    /**
     * 设置文档是否已添加序号
     */
    set hasNumbering(value: boolean);
    /**
     * 设置标题块列表
     * @param headerIds 标题块ID列表
     */
    setHeaderIds(headerIds: string[]): void;
    /**
     * 获取标题块列表
     * @returns 标题块ID列表
     */
    getHeaderIds(): string[];
    /**
     * 添加标题信息
     * @param blockId 块ID
     * @param info 标题信息
     */
    addHeaderInfo(blockId: string, info: HeaderInfo): void;
    /**
     * 批量添加标题信息
     * @param infoMap 块ID与标题信息的映射
     */
    batchAddHeaderInfo(infoMap: Map<string, HeaderInfo>): void;
    /**
     * 获取标题信息
     * @param blockId 块ID
     * @returns 标题信息，如果不存在则返回null
     */
    getHeaderInfo(blockId: string): HeaderInfo | null;
    /**
     * 获取所有标题信息
     * @returns 块ID与标题信息的映射
     */
    getAllHeaderInfo(): Map<string, HeaderInfo>;
    /**
     * 移除标题信息
     * @param blockId 块ID
     */
    removeHeaderInfo(blockId: string): void;
    /**
     * 清除所有标题信息
     */
    clearAll(): void;
    /**
     * 从JSON对象恢复数据
     * @param json JSON对象
     */
    fromJSON(json: any): void;
    /**
     * 转换为JSON对象
     * @returns 可序列化的对象
     */
    toJSON(): any;
}
/**
 * 标题信息接口
 */
export interface HeaderInfo {
    level: number;
    originalContent: string;
    sequenceNumber?: string;
    lastUpdated: number;
}
