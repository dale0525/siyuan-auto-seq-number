import { splitHeadingLine } from "./heading_line";
import { addMarker, readMarker, stripMarker } from "./marker_codec";
import { stripHeadingNumberPrefix } from "./prefix_cleaner";

export interface HeadingBlock {
    id: string;
    subtype: string;
    markdown: string;
}

export interface NumberingConfig {
    formats: string[];
    useChineseNumbers: boolean[];
}

export interface NumberingPlanResult {
    updates: Record<string, string>;
}

export interface ClearNumberingOptions {
    preservePrefix: boolean;
}

function parseHeadingLevel(subtype: string): number {
    const matched = subtype.match(/^h([1-6])$/);
    if (!matched) {
        return 0;
    }
    return Number.parseInt(matched[1], 10);
}

function parseHeadingContent(block: HeadingBlock): {
    prefix: string;
    content: string;
} | null {
    const level = parseHeadingLevel(block.subtype);
    if (level === 0) {
        return null;
    }

    const parsed = splitHeadingLine(block.markdown);
    if (parsed) {
        return {
            prefix: parsed.prefix,
            content: parsed.content,
        };
    }

    return {
        // Some SiYuan versions persist heading block markdown without "#" prefix.
        prefix: "",
        content: block.markdown,
    };
}

function num2Chinese(num: number): string {
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

function generateNumberFromFormat(
    format: string,
    counters: number[],
    useChinese: boolean
): string {
    let result = format;
    const placeholders = format.match(/\{(\d+)\}/g) || [];
    for (const placeholder of placeholders) {
        const matched = placeholder.match(/\{(\d+)\}/);
        if (!matched) {
            continue;
        }
        const counterIndex = Number.parseInt(matched[1], 10) - 1;
        const value = counters[counterIndex] ?? 0;
        result = result.replace(
            placeholder,
            useChinese ? num2Chinese(value) : String(value)
        );
    }
    return result;
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

    return Array.from(candidateSet).sort((left, right) => right.length - left.length);
}

function extractLegacyPrefix(text: string, number: string): string {
    if (!text || !number) {
        return "";
    }

    const candidates = buildLegacyNumberCandidates(number);
    for (const candidate of candidates) {
        if (!candidate || !text.startsWith(candidate)) {
            continue;
        }
        const rest = text.substring(candidate.length);
        const punctuationMatch = rest.match(/^[.。．、,，:：;；]+\s*/);
        if (punctuationMatch) {
            return candidate + punctuationMatch[0];
        }
        const spaceMatch = rest.match(/^\s+/);
        if (spaceMatch) {
            return candidate + spaceMatch[0];
        }
        return candidate;
    }

    return "";
}

export function planHeadingUpdates(
    headings: HeadingBlock[],
    config: NumberingConfig
): NumberingPlanResult {
    const updates: Record<string, string> = {};
    const counters = [0, 0, 0, 0, 0, 0];
    const seenLevels = new Set<number>();

    for (const heading of headings) {
        const level = parseHeadingLevel(heading.subtype);
        if (level === 0) {
            continue;
        }

        const parts = parseHeadingContent(heading);
        if (!parts) {
            continue;
        }

        seenLevels.add(level);
        const levels = Array.from(seenLevels).sort((left, right) => left - right);
        const actualLevel = levels.indexOf(level);
        if (actualLevel < 0) {
            continue;
        }

        counters[actualLevel]++;
        for (let index = actualLevel + 1; index < counters.length; index++) {
            counters[index] = 0;
        }

        const format =
            config.formats[actualLevel] ||
            config.formats[config.formats.length - 1] ||
            "{1}. ";
        const useChinese = config.useChineseNumbers[actualLevel] ?? false;
        const number = generateNumberFromFormat(format, counters, useChinese);

        const markerInfo = readMarker(parts.content);
        const restoredContent = markerInfo
            ? `${markerInfo.backupPrefix}${markerInfo.content}`
            : parts.content;
        const backupPrefix =
            markerInfo?.backupPrefix || extractLegacyPrefix(restoredContent, number);
        const contentWithoutPrefix =
            backupPrefix && restoredContent.startsWith(backupPrefix)
                ? restoredContent.substring(backupPrefix.length)
                : restoredContent;

        updates[heading.id] = `${parts.prefix}${addMarker(
            contentWithoutPrefix,
            number,
            backupPrefix
        )}`;
    }

    return { updates };
}

export function clearAutoNumbering(
    headings: HeadingBlock[],
    options: ClearNumberingOptions
): NumberingPlanResult {
    const updates: Record<string, string> = {};

    for (const heading of headings) {
        const restored = stripMarker(heading.markdown, {
            restorePrefix: options.preservePrefix,
        });
        if (restored !== heading.markdown) {
            updates[heading.id] = restored;
        }
    }

    return { updates };
}

export function clearAllHeadingNumbering(headings: HeadingBlock[]): NumberingPlanResult {
    const updates: Record<string, string> = {};

    for (const heading of headings) {
        const parts = parseHeadingContent(heading);
        if (!parts) {
            continue;
        }

        const withoutMarker = stripMarker(parts.content, {
            restorePrefix: false,
        });
        const cleanedContent = stripHeadingNumberPrefix(withoutMarker);
        const restoredMarkdown = `${parts.prefix}${cleanedContent}`;

        if (restoredMarkdown !== heading.markdown) {
            updates[heading.id] = restoredMarkdown;
        }
    }

    return { updates };
}
