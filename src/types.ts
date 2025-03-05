/**
 * 插件配置接口
 */
export interface IPluginConfig {
    // 每级标题的序号格式
    formats: string[];
    // 是否使用中文数字
    useChineseNumbers: boolean[];
    // 默认是否启用
    defaultEnabled: boolean;
    // 是否实时更新
    realTimeUpdate: boolean;
    // 每个文档的启用状态
    docEnableStatus: Record<string, boolean>;
}

/**
 * 设置项接口
 */
export interface ISettingItem {
    title: string;
    description?: string;
    createActionElement: () => HTMLElement;
}

/**
 * 标题信息接口
 */
export interface IHeaderInfo {
    id: string;
    level: number;
    text: string;
    originalText?: string;
    number?: string;
}

/**
 * 文档信息接口
 */
export interface IDocumentInfo {
    id: string;
    headers: IHeaderInfo[];
    hasNumbering: boolean;
    lastUpdated: number;
} 