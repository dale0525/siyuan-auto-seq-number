export declare function fetchSyncPost(url: string, data: any): Promise<any>;
export declare function updateBlockDom(blockId: string, content: string): Promise<void>;
/**
 * 批量修改块内容
 * @param updates 块ID和内容的键值对对象 {blockId: content}
 */
export declare function batchUpdateBlockDom(updates: Record<string, string>): Promise<void>;
export declare function getBlockDom(blockId: string): Promise<string | null>;
/**
 * 批量获取块内容
 * @param blockIds 块ID数组
 * @returns 块ID和内容的Map
 */
export declare function batchGetBlockDom(blockIds: string[]): Promise<Map<string, string>>;
export declare function getBlockAttrs(blockId: string): Promise<any>;
/**
 * 批量获取块属性
 * @param blockIds 块ID数组
 * @returns 块ID和属性的Map
 */
export declare function batchGetBlockAttrs(blockIds: string[]): Promise<Map<string, any>>;
export declare function setBlockAttrs(blockId: string, attrs: any): Promise<void>;
/**
 * 批量设置块属性
 * @param attrsMap 块ID和属性对象的Map
 */
export declare function batchSetBlockAttrs(attrsMap: Map<string, any>): Promise<void>;
