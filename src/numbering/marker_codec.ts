const MARKER_START = "\u2063\u2064\u2063";
const MARKER_END = "\u2064\u2063\u2064";
const HIDDEN_ZERO = "\u200b";
const HIDDEN_ONE = "\u200c";
const HIDDEN_SEPARATOR = "\u200d";

interface IMarkerPayload {
    backupPrefix: string;
    number: string;
}

interface IParsedMarker {
    payload: IMarkerPayload;
    markerStartIndex: number;
    markerEndIndex: number;
}

interface IMarkerExtractionResult {
    found: boolean;
    content: string;
    number: string;
    backupPrefix: string;
    backupPrefixInsertIndex: number | null;
}

interface ITextWithoutAutoNumber {
    beforeContent: string;
    afterContent: string;
}

export interface IMarkerInfo {
    backupPrefix: string;
    number: string;
    content: string;
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
            .map((character) => {
                if (character === HIDDEN_ZERO) {
                    return "0";
                }
                if (character === HIDDEN_ONE) {
                    return "1";
                }
                return "";
            })
            .join("");

        if (binary.length !== 16) {
            return null;
        }

        decoded += String.fromCharCode(Number.parseInt(binary, 2));
    }

    return decoded;
}

function parseMarker(text: string): IParsedMarker | null {
    const markerStartIndex = text.indexOf(MARKER_START);
    if (markerStartIndex < 0) {
        return null;
    }

    const markerPayloadStart = markerStartIndex + MARKER_START.length;
    const markerEndIndex = text.indexOf(MARKER_END, markerPayloadStart);
    if (markerEndIndex < 0) {
        return null;
    }

    const encodedPayload = text.substring(markerPayloadStart, markerEndIndex);
    const decodedPayload = decodeHiddenText(encodedPayload);
    if (decodedPayload === null) {
        return null;
    }

    try {
        const payload = JSON.parse(decodedPayload) as Partial<IMarkerPayload>;
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

function removeAutoNumberNearMarker(
    text: string,
    marker: IParsedMarker
): ITextWithoutAutoNumber {
    const beforeMarker = text.substring(0, marker.markerStartIndex);
    const afterMarker = text.substring(marker.markerEndIndex + MARKER_END.length);
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

function extractMarkers(text: string): IMarkerExtractionResult {
    let remainingContent = text;
    let found = false;
    let backupPrefix = "";
    let backupPrefixInsertIndex: number | null = null;
    let number = "";
    let maxRound = 20;

    while (maxRound > 0) {
        const marker = parseMarker(remainingContent);
        if (!marker) {
            break;
        }

        found = true;
        if (!number && marker.payload.number) {
            number = marker.payload.number;
        }

        const { beforeContent, afterContent } = removeAutoNumberNearMarker(
            remainingContent,
            marker
        );

        if (!backupPrefix && marker.payload.backupPrefix) {
            backupPrefix = marker.payload.backupPrefix;
            backupPrefixInsertIndex = beforeContent.length;
        }

        remainingContent = `${beforeContent}${afterContent}`;
        maxRound--;
    }

    return {
        found,
        content: remainingContent,
        number,
        backupPrefix,
        backupPrefixInsertIndex,
    };
}

export function addMarker(
    content: string,
    autoNumber: string,
    backupPrefix = ""
): string {
    const encodedPayload = encodeHiddenText(
        JSON.stringify({
            backupPrefix,
            number: autoNumber,
        })
    );

    return `${autoNumber}${MARKER_START}${encodedPayload}${MARKER_END}${content}`;
}

export function readMarker(text: string): IMarkerInfo | null {
    const result = extractMarkers(text);
    if (!result.found) {
        return null;
    }

    return {
        backupPrefix: result.backupPrefix,
        number: result.number,
        content: result.content,
    };
}

export function stripMarker(
    text: string,
    options: {
        restorePrefix: boolean;
    }
): string {
    const result = extractMarkers(text);
    if (!result.found) {
        return text;
    }

    if (!options.restorePrefix || !result.backupPrefix) {
        return result.content;
    }

    const insertIndex = Math.max(
        0,
        Math.min(result.backupPrefixInsertIndex ?? 0, result.content.length)
    );
    return (
        result.content.slice(0, insertIndex) +
        result.backupPrefix +
        result.content.slice(insertIndex)
    );
}
