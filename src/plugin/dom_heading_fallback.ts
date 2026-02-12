import { IPluginConfig } from "../types";
import {
    generateHeaderNumber,
    hasHeaderNumber,
    removeHeaderNumber,
} from "../utils/header_utils";
import { stripHeadingNumberPrefix } from "../numbering/prefix_cleaner";

export interface IDomHeadingRecord {
    id: string;
    level: number;
    htmlContent: string;
}

function getExistingLevels(records: IDomHeadingRecord[]): number[] {
    return Array.from(
        new Set(
            records
                .map((record) => record.level)
                .filter((level) => level >= 1 && level <= 6)
        )
    ).sort((left, right) => left - right);
}

export function buildDomNumberingUpdates(
    records: IDomHeadingRecord[],
    config: Pick<IPluginConfig, "formats" | "useChineseNumbers">
): Record<string, string> {
    const updates: Record<string, string> = {};
    const counters = [0, 0, 0, 0, 0, 0];
    const existingLevels = getExistingLevels(records);

    for (const record of records) {
        if (record.level < 1 || record.level > 6) {
            continue;
        }

        const actualLevel = existingLevels.indexOf(record.level);
        if (actualLevel < 0) {
            continue;
        }
        const format = config.formats[actualLevel] || "{1}. ";
        const originalContent = hasHeaderNumber(record.htmlContent, format)
            ? removeHeaderNumber(record.htmlContent, format)
            : record.htmlContent;

        const [number, newCounters] = generateHeaderNumber(
            record.level,
            counters,
            config.formats,
            config.useChineseNumbers,
            existingLevels
        );
        Object.assign(counters, newCounters);

        const nextContent = number + originalContent;
        if (nextContent !== record.htmlContent) {
            updates[record.id] = nextContent;
        }
    }

    return updates;
}

export function buildDomClearUpdates(
    records: IDomHeadingRecord[],
    config: Pick<IPluginConfig, "formats">
): Record<string, string> {
    const updates: Record<string, string> = {};
    const existingLevels = getExistingLevels(records);

    for (const record of records) {
        if (record.level < 1 || record.level > 6) {
            continue;
        }

        const actualLevel = existingLevels.indexOf(record.level);
        if (actualLevel < 0) {
            continue;
        }
        const format = config.formats[actualLevel] || "{1}. ";

        if (hasHeaderNumber(record.htmlContent, format)) {
            updates[record.id] = removeHeaderNumber(record.htmlContent, format);
        }
    }

    return updates;
}

export function buildDomClearAllUpdates(
    records: IDomHeadingRecord[]
): Record<string, string> {
    const updates: Record<string, string> = {};

    for (const record of records) {
        if (record.level < 1 || record.level > 6) {
            continue;
        }

        const cleaned = stripHeadingNumberPrefix(record.htmlContent);
        if (cleaned !== record.htmlContent) {
            updates[record.id] = cleaned;
        }
    }

    return updates;
}
