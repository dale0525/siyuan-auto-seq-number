const AUTO_NUMBER_MARKER_START = "\u2063\u2064\u2063";
const AUTO_NUMBER_MARKER_END = "\u2064\u2063\u2064";
const HIDDEN_ZERO = "\u200b";
const HIDDEN_ONE = "\u200c";
const HIDDEN_SEPARATOR = "\u200d";

interface IAutoMarkerPayload {
    backupPrefix: string;
    number: string;
}

interface IParsedMarker {
    payload: IAutoMarkerPayload;
    markerStartIndex: number;
    markerEndIndex: number;
}

export interface IAutoNumberMarkerInfo {
    backupPrefix: string;
    number: string;
    content: string;
}

interface ITextWithoutAutoNumber {
    beforeContent: string;
    afterContent: string;
}

function encodeHiddenText(text: string): string {
    return text
        .split("")
        .map((character) => {
            return character
                .charCodeAt(0)
                .toString(2)
                .padStart(16, "0")
                .replace(/0/g, HIDDEN_ZERO)
                .replace(/1/g, HIDDEN_ONE);
        })
        .join(HIDDEN_SEPARATOR);
}

function decodeHiddenText(text: string): string | null {
    if (!text) {
        return "";
    }

    const chunks = text.split(HIDDEN_SEPARATOR);
    const hiddenChunkPattern = new RegExp(`^[${HIDDEN_ZERO}${HIDDEN_ONE}]{16}$`);

    let decoded = "";
    for (const chunk of chunks) {
        if (!hiddenChunkPattern.test(chunk)) {
            return null;
        }

        const binary = chunk
            .split("")
            .map((char) => {
                if (char === HIDDEN_ZERO) {
                    return "0";
                }
                if (char === HIDDEN_ONE) {
                    return "1";
                }
                return "";
            })
            .join("");

        if (binary.length !== 16) {
            return null;
        }

        decoded += String.fromCharCode(parseInt(binary, 2));
    }

    return decoded;
}

function parseMarker(text: string): IParsedMarker | null {
    const markerStartIndex = text.indexOf(AUTO_NUMBER_MARKER_START);
    if (markerStartIndex === -1) {
        return null;
    }

    const markerPayloadStart = markerStartIndex + AUTO_NUMBER_MARKER_START.length;
    const markerEndIndex = text.indexOf(
        AUTO_NUMBER_MARKER_END,
        markerPayloadStart
    );
    if (markerEndIndex === -1) {
        return null;
    }

    const encodedPayload = text.substring(
        markerPayloadStart,
        markerEndIndex
    );
    const decodedPayload = decodeHiddenText(encodedPayload);
    if (decodedPayload === null) {
        return null;
    }

    try {
        const payload = JSON.parse(decodedPayload) as Partial<IAutoMarkerPayload>;
        if (
            typeof payload.backupPrefix !== "string" ||
            typeof payload.number !== "string"
        ) {
            return null;
        }

        return {
            payload: {
                backupPrefix: payload.backupPrefix,
                number: payload.number,
            },
            markerStartIndex,
            markerEndIndex,
        };
    } catch {
        return null;
    }
}

/**
 * 将数字转换为中文数字
 * @param num 要转换的数字
 * @returns 转换后的中文数字
 */
export function num2Chinese(num: number): string {
    const units = ["", "十", "百", "千", "万"];
    const numbers = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

    if (num === 0) return numbers[0];
    if (num < 0) return "负" + num2Chinese(-num);
    if (num < 10) return numbers[num];

    let result = "";
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

    result = result.replace(/零+$/, "");
    result = result.replace(/零+/g, "零");

    if (result.startsWith("一十")) {
        result = result.substring(1);
    }

    return result;
}

/**
 * 为自动序号添加隐藏标记，仅用于插件识别与移除
 */
export function addAutoNumberMarker(number: string, backupPrefix = ""): string {
    const encodedPayload = encodeHiddenText(
        JSON.stringify({
            backupPrefix,
            number,
        })
    );
    return `${number}${AUTO_NUMBER_MARKER_START}${encodedPayload}${AUTO_NUMBER_MARKER_END}`;
}

function removeAutoNumberNearMarker(
    text: string,
    marker: IParsedMarker
): ITextWithoutAutoNumber {
    const beforeMarker = text.substring(0, marker.markerStartIndex);
    const afterMarker = text.substring(
        marker.markerEndIndex + AUTO_NUMBER_MARKER_END.length
    );
    const markerNumber = marker.payload.number;

    if (markerNumber && afterMarker.startsWith(markerNumber)) {
        return {
            beforeContent: beforeMarker,
            afterContent: afterMarker.substring(markerNumber.length),
        };
    }

    if (markerNumber && beforeMarker.endsWith(markerNumber)) {
        return {
            beforeContent: beforeMarker.substring(
                0,
                beforeMarker.length - markerNumber.length
            ),
            afterContent: afterMarker,
        };
    }

    return {
        beforeContent: beforeMarker,
        afterContent: afterMarker,
    };
}

/**
 * 提取自动序号标记信息
 */
export function extractAutoNumberMarkerInfo(text: string): IAutoNumberMarkerInfo | null {
    const marker = parseMarker(text);
    if (!marker) {
        return null;
    }

    const { beforeContent, afterContent } = removeAutoNumberNearMarker(text, marker);

    return {
        backupPrefix: marker.payload.backupPrefix,
        number: marker.payload.number,
        content: `${beforeContent}${afterContent}`,
    };
}

/**
 * 移除插件自动添加的隐藏标记与对应序号，不影响用户手动输入内容
 */
export function stripAutoNumberMarker(
    text: string,
    restoreBackupPrefix = false
): string {
    const marker = parseMarker(text);
    if (!marker) {
        return text;
    }

    const { beforeContent, afterContent } = removeAutoNumberNearMarker(text, marker);
    const backupPrefix = restoreBackupPrefix ? marker.payload.backupPrefix : "";

    return `${beforeContent}${backupPrefix}${afterContent}`;
}

interface IMarkdownHeadingParts {
    prefix: string;
    content: string;
}

/**
 * 拆分 markdown 标题前缀（# 和空格）以及实际内容
 */
export function splitMarkdownHeading(text: string): IMarkdownHeadingParts | null {
    const matched = text.match(/^(\s*#{1,6}\s*)([\s\S]*)$/);
    if (!matched) {
        return null;
    }

    return {
        prefix: matched[1],
        content: matched[2],
    };
}

function buildLegacyNumberCandidates(number: string): string[] {
    const candidateSet = new Set<string>();
    const trimmed = number.replace(/\s+$/, "");

    if (number) {
        candidateSet.add(number);
    }
    if (trimmed) {
        candidateSet.add(trimmed);
        candidateSet.add(`${trimmed} `);
    }

    if (/[.。．、,，:：;；]$/.test(trimmed)) {
        const withoutTail = trimmed.slice(0, -1);
        if (withoutTail) {
            candidateSet.add(withoutTail);
            candidateSet.add(`${withoutTail} `);
        }
    }

    return Array.from(candidateSet).sort((a, b) => b.length - a.length);
}

/**
 * 从内容前缀中识别兼容旧版本的自动序号
 */
export function extractLegacyAutoNumberPrefix(
    text: string,
    generatedNumber: string
): string {
    if (!text || !generatedNumber) {
        return "";
    }

    const candidates = buildLegacyNumberCandidates(generatedNumber);

    for (const candidate of candidates) {
        if (!candidate || !text.startsWith(candidate)) {
            continue;
        }

        const rest = text.substring(candidate.length);
        const punctuationMatch = rest.match(/^[.。．、,，:：;；]+\s*/);
        if (punctuationMatch) {
            return candidate + punctuationMatch[0];
        }

        const trailingSpaceMatch = rest.match(/^\s+/);
        if (trailingSpaceMatch) {
            return candidate + trailingSpaceMatch[0];
        }

        return candidate;
    }

    return "";
}

/**
 * 获取标题的实际层级
 * @param level 原始标题级别（1-6）
 * @param existingLevels 文档中已存在的标题级别列表，必须是排序后的
 * @returns 实际层级（0-based）
 */
function getActualHeaderLevel(level: number, existingLevels: number[]): number {
    const index = existingLevels.indexOf(level);
    if (index !== -1) {
        return index;
    }

    return Math.max(0, Math.min(level - 1, 5));
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
    const actualLevel =
        existingLevels.length > 0
            ? getActualHeaderLevel(level, existingLevels)
            : Math.max(0, Math.min(level - 1, 5));

    const newCounters = [...counters];
    newCounters[actualLevel]++;

    for (let i = actualLevel + 1; i < newCounters.length; i++) {
        newCounters[i] = 0;
    }

    const format = formats[actualLevel] ?? formats[formats.length - 1] ?? "{1}. ";

    let result = format;
    const placeholders = format.match(/\{(\d+)\}/g) || [];

    for (const placeholder of placeholders) {
        const match = placeholder.match(/\{(\d+)\}/);
        if (!match) continue;

        const index = parseInt(match[1]) - 1;
        const shouldUseChinese = useChineseNumbers[actualLevel];
        const num = newCounters[index];
        const numStr = shouldUseChinese ? num2Chinese(num) : num.toString();
        result = result.replace(placeholder, numStr);
    }

    return [result, newCounters];
}

/**
 * 检查文本是否包含序号
 * @param text 要检查的文本或HTML内容
 * @param format 序号格式
 * @returns 如果包含序号返回true，否则返回false
 */
export function hasHeaderNumber(text: string, format: string): boolean {
    const placeholders = format.match(/\{(\d+)\}/g) || [];
    let regexPattern = format;

    const tempMarkers: string[] = [];
    placeholders.forEach((placeholder, index) => {
        const marker = `__PLACEHOLDER_${index}__`;
        tempMarkers.push(marker);
        regexPattern = regexPattern.replace(placeholder, marker);
    });

    regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    tempMarkers.forEach((marker) => {
        const numbers = ["0"];
        for (let i = 1; i <= 99; i++) {
            numbers.push(i.toString(), num2Chinese(i));
        }
        regexPattern = regexPattern.replace(
            marker,
            `(${numbers.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`
        );
    });

    const regex = new RegExp(`^${regexPattern}`);
    return regex.test(text);
}

/**
 * 从文本中移除序号
 * @param text 要处理的文本或HTML内容
 * @param format 序号格式
 * @returns 移除序号后的文本
 */
export function removeHeaderNumber(text: string, format: string): string {
    const placeholders = format.match(/\{(\d+)\}/g) || [];
    let regexPattern = format;

    const tempMarkers: string[] = [];
    placeholders.forEach((placeholder, index) => {
        const marker = `__PLACEHOLDER_${index}__`;
        tempMarkers.push(marker);
        regexPattern = regexPattern.replace(placeholder, marker);
    });

    regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    tempMarkers.forEach((marker) => {
        const numbers = ["0"];
        for (let i = 1; i <= 99; i++) {
            numbers.push(i.toString(), num2Chinese(i));
        }
        regexPattern = regexPattern.replace(
            marker,
            `(${numbers.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`
        );
    });

    const regex = new RegExp(`^${regexPattern}`);
    return text.replace(regex, "");
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
