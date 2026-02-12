function normalizeVersionPart(rawPart: string): number {
    const digits = rawPart.replace(/\D/g, "");
    if (!digits) {
        return 0;
    }
    return Number.parseInt(digits, 10);
}

function parseVersion(version: string): number[] {
    const cleaned = version.trim().replace(/^[^\d]*/, "");
    const core = cleaned.split(/[-+]/)[0] || "";
    if (!core) {
        return [0];
    }

    return core.split(".").map(normalizeVersionPart);
}

export function compareVersion(left: string, right: string): number {
    const leftParts = parseVersion(left);
    const rightParts = parseVersion(right);
    const maxLength = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < maxLength; index++) {
        const leftValue = leftParts[index] ?? 0;
        const rightValue = rightParts[index] ?? 0;
        if (leftValue > rightValue) {
            return 1;
        }
        if (leftValue < rightValue) {
            return -1;
        }
    }

    return 0;
}

export function isVersionAtLeast(current: string, minimum: string): boolean {
    return compareVersion(current, minimum) >= 0;
}
