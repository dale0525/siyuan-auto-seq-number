/**
 * 插件配置接口
 */
export interface IPluginConfig {
    formats: string[];
    useChineseNumbers: boolean[];
    defaultEnabled: boolean;
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
