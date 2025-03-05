/**
 * 思源笔记API工具函数
 */
/**
 * 批量获取块属性
 * @param blockIds 块ID数组
 * @returns 块属性映射表
 */
export declare function batchGetBlockAttrs(blockIds: string[]): Promise<Record<string, any>>;
/**
 * 批量设置块属性
 * @param attrs 块ID到属性的映射
 */
export declare function batchSetBlockAttrs(attrs: Record<string, Record<string, string>>): Promise<void>;
/**
 * 批量获取块内容
 * @param blockIds 块ID数组
 * @returns 块内容映射表
 */
export declare function batchGetBlockContent(blockIds: string[]): Promise<Record<string, string>>;
/**
 * 批量更新块内容
 * @param contents 块ID到内容的映射
 */
export declare function batchUpdateBlockContent(contents: Record<string, string>): Promise<void>;
/**
 * 获取文档大纲
 * @param docId 文档ID
 * @returns 大纲数据
 */
export declare function getDocumentOutline(docId: string): Promise<any[]>;
/**
 * 获取文档块树
 * @param docId 文档ID
 * @returns 块树数据
 */
export declare function getDocumentBlockTree(docId: string): Promise<any>;
