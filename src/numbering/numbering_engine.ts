import { splitHeadingLine } from "./heading_line";
import { readMarker, stripMarker } from "./marker_codec";
import {
    buildNumberingStateAttrs,
    NumberingState,
    readNumberingState,
} from "./numbering_state";
import { stripHeadingNumberPrefix } from "./prefix_cleaner";

export interface HeadingBlock {
    id: string;
    subtype: string;
    markdown: string;
    attrs?: Record<string, string>;
}

export interface NumberingConfig {
    formats: string[];
    useChineseNumbers: boolean[];
}

export interface NumberingPlanResult {
    updates: Record<string, string>;
    attrs: Record<string, Record<string, string>>;
}

export interface ClearNumberingOptions {
    preservePrefix: boolean;
}

function resolveStoredState(block: HeadingBlock): NumberingState | null {
    return readNumberingState(block.attrs);
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasStableNumberAnchor(sample: string): boolean {
    return Array.from(sample).some((character) => {
        return (
            !/[0-9０-９]/u.test(character) &&
            !/[一二三四五六七八九十百千万零〇两]/u.test(character) &&
            !/\s/u.test(character)
        );
    });
}

function buildNumberShapePattern(sample: string): RegExp | null {
    if (!sample || !hasStableNumberAnchor(sample)) {
        return null;
    }

    let pattern = "";
    let index = 0;
    while (index < sample.length) {
        const digitMatch = sample.slice(index).match(/^[0-9０-９]+/u);
        if (digitMatch) {
            pattern += "[0-9０-９]+";
            index += digitMatch[0].length;
            continue;
        }

        const chineseMatch = sample
            .slice(index)
            .match(/^[一二三四五六七八九十百千万零〇两]+/u);
        if (chineseMatch) {
            pattern += "[一二三四五六七八九十百千万零〇两]+";
            index += chineseMatch[0].length;
            continue;
        }

        pattern += escapeRegExp(sample[index]);
        index++;
    }

    return pattern ? new RegExp(`^(${pattern})`, "u") : null;
}

function extractStoredNumberPrefix(text: string, sample: string): string {
    if (!text || !sample) {
        return "";
    }

    const pattern = buildNumberShapePattern(sample);
    const match = pattern?.exec(text);
    return match?.[1] || "";
}

function restoreStoredContent(
    content: string,
    storedState: NumberingState | null,
    generatedNumber: string
): string {
    if (!storedState) {
        return content;
    }

    if (storedState.number && content.startsWith(storedState.number)) {
        return `${storedState.backupPrefix}${content.substring(storedState.number.length)}`;
    }

    const storedPrefix = extractStoredNumberPrefix(content, storedState.number);
    if (storedPrefix) {
        return `${storedState.backupPrefix}${content.substring(storedPrefix.length)}`;
    }

    const generatedPrefix = extractStoredNumberPrefix(content, generatedNumber);
    if (generatedPrefix) {
        return `${storedState.backupPrefix}${content.substring(generatedPrefix.length)}`;
    }

    return content;
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
    const attrs: Record<string, Record<string, string>> = {};
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
        const storedState = resolveStoredState(heading);
        const restoredContent = markerInfo
            ? `${markerInfo.backupPrefix}${markerInfo.content}`
            : restoreStoredContent(parts.content, storedState, number);
        const backupPrefix =
            markerInfo?.backupPrefix ||
            storedState?.backupPrefix ||
            extractLegacyPrefix(restoredContent, number);
        const contentWithoutPrefix =
            backupPrefix && restoredContent.startsWith(backupPrefix)
                ? restoredContent.substring(backupPrefix.length)
                : restoredContent;

        updates[heading.id] = `${parts.prefix}${number}${contentWithoutPrefix}`;
        attrs[heading.id] = buildNumberingStateAttrs({
            number,
            backupPrefix,
        });
    }

    return { updates, attrs };
}

export function clearAutoNumbering(
    headings: HeadingBlock[],
    options: ClearNumberingOptions
): NumberingPlanResult {
    const updates: Record<string, string> = {};
    const attrs: Record<string, Record<string, string>> = {};

    for (const heading of headings) {
        const storedState = resolveStoredState(heading);
        const restored = stripMarker(heading.markdown, {
            restorePrefix: options.preservePrefix,
        });
        const finalRestored =
            restored !== heading.markdown
                ? restored
                : (() => {
                      const parts = parseHeadingContent(heading);
                      if (!parts || !storedState || !storedState.number) {
                          return heading.markdown;
                      }

                      const visiblePrefix =
                          parts.content.startsWith(storedState.number)
                              ? storedState.number
                              : extractStoredNumberPrefix(
                                    parts.content,
                                    storedState.number
                                );
                      if (!visiblePrefix) {
                          return heading.markdown;
                      }

                      const content = parts.content.substring(visiblePrefix.length);
                      const mergedContent = options.preservePrefix
                          ? `${storedState.backupPrefix}${content}`
                          : content;
                      return `${parts.prefix}${mergedContent}`;
                  })();

        if (finalRestored !== heading.markdown) {
            updates[heading.id] = finalRestored;
        }
        if (storedState || restored !== heading.markdown) {
            attrs[heading.id] = buildNumberingStateAttrs(null);
        }
    }

    return { updates, attrs };
}

export function clearAllHeadingNumbering(headings: HeadingBlock[]): NumberingPlanResult {
    const updates: Record<string, string> = {};
    const attrs: Record<string, Record<string, string>> = {};

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

        if (resolveStoredState(heading)) {
            attrs[heading.id] = buildNumberingStateAttrs(null);
        }
    }

    return { updates, attrs };
}
