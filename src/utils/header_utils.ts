/**
 * 将数字转换为中文数字
 * @param num 要转换的数字
 * @returns 转换后的中文数字
 */
export function num2Chinese(num: number): string {
    const units = ['', '十', '百', '千', '万'];
    const numbers = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    
    if (num === 0) return numbers[0];
    if (num < 0) return '负' + num2Chinese(-num);
    if (num < 10) return numbers[num];
    
    let result = '';
    let temp = num;
    let unitIndex = 0;
    
    while (temp > 0) {
        const digit = temp % 10;
        if (digit === 0) {
            if (result && result[0] !== numbers[0]) {
                result = numbers[0] + result;
            }
        } else {
            result = numbers[digit] + units[unitIndex] + result;
        }
        temp = Math.floor(temp / 10);
        unitIndex++;
    }
    
    // 处理特殊情况
    result = result.replace(/零+$/, ''); // 移除末尾的零
    result = result.replace(/零+/g, '零'); // 多个零合并为一个
    
    // 处理"一十"开头的情况
    if (result.startsWith('一十')) {
        result = result.substring(1);
    }
    
    return result;
}

/**
 * 获取标题的实际层级
 * @param level 原始标题级别（1-6）
 * @param existingLevels 文档中已存在的标题级别列表，必须是排序后的
 * @returns 实际层级（0-based）
 */
function getActualHeaderLevel(level: number, existingLevels: number[]): number {
    return existingLevels.indexOf(level);
}

/**
 * 生成标题序号
 * @param level 标题级别（1-6）
 * @param counters 当前计数器状态
 * @param formats 序号格式配置
 * @param useChineseNumbers 是否使用中文数字
 * @param existingLevels 文档中已存在的标题级别列表，必须是排序后的
 * @returns [生成的序号, 更新后的计数器]
 */
export function generateHeaderNumber(
    level: number,
    counters: number[],
    formats: string[],
    useChineseNumbers: boolean[],
    existingLevels: number[] = []
): [string, number[]] {
    // 获取实际层级
    const actualLevel = existingLevels.length > 0 ? getActualHeaderLevel(level, existingLevels) : level - 1;
    
    // 复制计数器以避免修改原数组
    const newCounters = [...counters];
    
    // 增加当前级别的计数
    newCounters[actualLevel]++;
    
    // 重置所有低级别的计数
    for (let i = actualLevel + 1; i < newCounters.length; i++) {
        newCounters[i] = 0;
    }
    
    // 获取当前级别的格式
    const format = formats[actualLevel];
    
    // 生成序号
    let result = format;
    // 找出所有占位符
    const placeholders = format.match(/\{(\d+)\}/g) || [];
    
    for (const placeholder of placeholders) {
        // 获取占位符中的数字
        const match = placeholder.match(/\{(\d+)\}/);
        if (!match) continue;
        const index = parseInt(match[1]) - 1;
        // 使用当前标题级别的 useChineseNumbers 设置
        const shouldUseChinese = useChineseNumbers[actualLevel];
        const num = newCounters[index];
        const numStr = shouldUseChinese ? num2Chinese(num) : num.toString();
        result = result.replace(placeholder, numStr);
    }
    
    return [result, newCounters];
}

/**
 * 检查文本是否包含序号
 * @param text 要检查的文本
 * @param format 序号格式
 * @returns 如果包含序号返回true，否则返回false
 */
export function hasHeaderNumber(text: string, format: string): boolean {
    // 找出所有占位符
    const placeholders = format.match(/\{(\d+)\}/g) || [];
    let regexPattern = format;
    
    // 先替换占位符为临时标记，避免被转义
    const tempMarkers: string[] = [];
    placeholders.forEach((placeholder, index) => {
        const marker = `__PLACEHOLDER_${index}__`;
        tempMarkers.push(marker);
        regexPattern = regexPattern.replace(placeholder, marker);
    });
    
    // 转义正则表达式特殊字符
    regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 还原占位符并替换为数字匹配模式
    tempMarkers.forEach((marker, index) => {
        const numbers = ['0']; // 添加0作为可能的数字
        for (let i = 1; i <= 99; i++) {
            numbers.push(i.toString(), num2Chinese(i));
        }
        regexPattern = regexPattern.replace(
            marker,
            `(${numbers.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`
        );
    });
    
    const regex = new RegExp(`^${regexPattern}`);
    return regex.test(text);
}

/**
 * 从文本中移除序号
 * @param text 要处理的文本
 * @param format 序号格式
 * @returns 移除序号后的文本
 */
export function removeHeaderNumber(text: string, format: string): string {
    // 找出所有占位符
    const placeholders = format.match(/\{(\d+)\}/g) || [];
    let regexPattern = format;
    
    // 先替换占位符为临时标记，避免被转义
    const tempMarkers: string[] = [];
    placeholders.forEach((placeholder, index) => {
        const marker = `__PLACEHOLDER_${index}__`;
        tempMarkers.push(marker);
        regexPattern = regexPattern.replace(placeholder, marker);
    });
    
    // 转义正则表达式特殊字符
    regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 还原占位符并替换为数字匹配模式
    tempMarkers.forEach((marker, index) => {
        const numbers = ['0']; // 添加0作为可能的数字
        for (let i = 1; i <= 99; i++) {
            numbers.push(i.toString(), num2Chinese(i));
        }
        regexPattern = regexPattern.replace(
            marker,
            `(${numbers.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`
        );
    });
    
    const regex = new RegExp(`^${regexPattern}`);
    return text.replace(regex, '');
}

/**
 * 获取标题级别
 * @param element 标题元素
 * @returns 标题级别（1-6），如果不是标题则返回0
 */
export function getHeaderLevel(element: Element): number {
    for (let i = 1; i <= 6; i++) {
        if (element.classList.contains(`h${i}`)) {
            return i;
        }
    }
    return 0;
} 