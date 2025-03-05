/**
 * 文档标题管理器
 * 用于管理文档中的标题信息，替代依赖block属性的方式
 */
export class DocumentHeaderManager {
    constructor() {
        // 文档ID -> 文档标题信息的映射
        this.documentHeaders = new Map();
    }
    /**
     * 获取所有文档的标题信息
     * @returns 文档ID和标题信息的Map
     */
    getAllDocumentHeaders() {
        return this.documentHeaders;
    }
    /**
     * 初始化或获取文档的标题信息
     * @param docId 文档ID
     * @returns 文档标题信息对象
     */
    getDocumentHeaders(docId) {
        if (!this.documentHeaders.has(docId)) {
            this.documentHeaders.set(docId, new DocumentHeaders());
        }
        return this.documentHeaders.get(docId);
    }
    /**
     * 检查文档是否有标题信息
     * @param docId 文档ID
     * @returns 是否有标题信息
     */
    hasDocumentHeaders(docId) {
        return this.documentHeaders.has(docId);
    }
    /**
     * 清除文档的标题信息
     * @param docId 文档ID
     */
    clearDocumentHeaders(docId) {
        this.documentHeaders.delete(docId);
    }
    /**
     * 清除所有文档的标题信息
     */
    clearAll() {
        this.documentHeaders.clear();
    }
}
/**
 * 文档标题信息类
 * 存储文档中所有标题的信息
 */
export class DocumentHeaders {
    constructor() {
        // 标题块ID列表，按文档中的顺序排列
        this.headerIds = [];
        // 块ID -> 标题信息的映射
        this.headerInfoMap = new Map();
        // 文档是否已添加序号
        this._hasNumbering = false;
    }
    /**
     * 获取文档是否已添加序号
     */
    get hasNumbering() {
        return this._hasNumbering;
    }
    /**
     * 设置文档是否已添加序号
     */
    set hasNumbering(value) {
        this._hasNumbering = value;
    }
    /**
     * 设置标题块列表
     * @param headerIds 标题块ID列表
     */
    setHeaderIds(headerIds) {
        this.headerIds = [...headerIds];
    }
    /**
     * 获取标题块列表
     * @returns 标题块ID列表
     */
    getHeaderIds() {
        return [...this.headerIds];
    }
    /**
     * 添加标题信息
     * @param blockId 块ID
     * @param info 标题信息
     */
    addHeaderInfo(blockId, info) {
        // 如果是新的标题块，添加到列表中
        if (!this.headerInfoMap.has(blockId) && !this.headerIds.includes(blockId)) {
            this.headerIds.push(blockId);
        }
        this.headerInfoMap.set(blockId, info);
    }
    /**
     * 批量添加标题信息
     * @param infoMap 块ID与标题信息的映射
     */
    batchAddHeaderInfo(infoMap) {
        for (const [blockId, info] of infoMap.entries()) {
            this.addHeaderInfo(blockId, info);
        }
    }
    /**
     * 获取标题信息
     * @param blockId 块ID
     * @returns 标题信息，如果不存在则返回null
     */
    getHeaderInfo(blockId) {
        return this.headerInfoMap.get(blockId) || null;
    }
    /**
     * 获取所有标题信息
     * @returns 块ID与标题信息的映射
     */
    getAllHeaderInfo() {
        return new Map(this.headerInfoMap);
    }
    /**
     * 移除标题信息
     * @param blockId 块ID
     */
    removeHeaderInfo(blockId) {
        this.headerInfoMap.delete(blockId);
        const index = this.headerIds.indexOf(blockId);
        if (index !== -1) {
            this.headerIds.splice(index, 1);
        }
    }
    /**
     * 清除所有标题信息
     */
    clearAll() {
        this.headerIds = [];
        this.headerInfoMap.clear();
        this._hasNumbering = false;
    }
    /**
     * 从JSON对象恢复数据
     * @param json JSON对象
     */
    fromJSON(json) {
        if (!json)
            return;
        // 恢复标题块ID列表
        this.headerIds = Array.isArray(json.headerIds) ? [...json.headerIds] : [];
        // 恢复标题信息映射
        this.headerInfoMap = new Map();
        if (json.headerInfoMap && typeof json.headerInfoMap === 'object') {
            for (const [key, value] of Object.entries(json.headerInfoMap)) {
                this.headerInfoMap.set(key, value);
            }
        }
        // 恢复编号状态
        this._hasNumbering = !!json._hasNumbering;
    }
    /**
     * 转换为JSON对象
     * @returns 可序列化的对象
     */
    toJSON() {
        return {
            headerIds: [...this.headerIds],
            headerInfoMap: Object.fromEntries(this.headerInfoMap),
            _hasNumbering: this._hasNumbering
        };
    }
}
//# sourceMappingURL=document_header_manager.js.map