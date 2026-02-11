function normalizeVersion(version: string): number[] | null {
    const matched = version.trim().match(/^v?(\d+(?:\.\d+)*)(?:[-+].*)?$/i);
    if (!matched) {
        return null;
    }

    const parts = matched[1].split(".").map((part) => {
        return Number.parseInt(part, 10);
    });

    if (parts.some((part) => Number.isNaN(part))) {
        return null;
    }

    return parts;
}

/**
 * Compare two versions and check whether version >= minimumVersion.
 */
export function isVersionGreaterOrEqual(
    version: string,
    minimumVersion: string
): boolean {
    const currentParts = normalizeVersion(version);
    const minimumParts = normalizeVersion(minimumVersion);

    if (!currentParts || !minimumParts) {
        return false;
    }

    const maxLength = Math.max(currentParts.length, minimumParts.length);
    for (let index = 0; index < maxLength; index++) {
        const currentPart = currentParts[index] ?? 0;
        const minimumPart = minimumParts[index] ?? 0;

        if (currentPart > minimumPart) {
            return true;
        }
        if (currentPart < minimumPart) {
            return false;
        }
    }

    return true;
}
