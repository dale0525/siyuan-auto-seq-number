/**
 * 将数字转换为中文数字
 * @param num 要转换的数字
 * @returns 转换后的中文数字
 */
export declare function num2Chinese(num: number): string;
/**
 * 生成标题序号
 * @param level 标题级别（1-6）
 * @param counters 当前计数器状态
 * @param formats 序号格式配置
 * @param useChineseNumbers 是否使用中文数字
 * @returns [生成的序号, 更新后的计数器]
 */
export declare function generateHeaderNumber(level: number, counters: number[], formats: string[], useChineseNumbers: boolean[]): [string, number[]];
/**
 * 检查文本是否包含序号
 * @param text 要检查的文本
 * @param format 序号格式
 * @returns 如果包含序号返回true，否则返回false
 */
export declare function hasHeaderNumber(text: string, format: string): boolean;
/**
 * 从文本中移除序号
 * @param text 要处理的文本
 * @param format 序号格式
 * @returns 移除序号后的文本
 */
export declare function removeHeaderNumber(text: string, format: string): string;
/**
 * 获取标题级别
 * @param element 标题元素
 * @returns 标题级别（1-6），如果不是标题则返回0
 */
export declare function getHeaderLevel(element: Element): number;
