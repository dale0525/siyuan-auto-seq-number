const PREFIX_PATTERNS: RegExp[] = [
    // Parenthesized enumerations, e.g. "(1) ", "（一）", "[A] "
    /^(?:\(|（|\[|【)\s*(?:[0-9０-９]{1,3}|[一二三四五六七八九十百千万零〇两]{1,8}|[IVXLCDMivxlcdm]{1,8}|[A-Za-z])\s*(?:\)|）|\]|】)(?:[、，,.:：．。;；\-—])?\s*/u,
    // Hierarchical arabic numbering, e.g. "1.2 ", "1.2.3 "
    /^(?:[0-9０-９]{1,3}(?:[.．。·、-][0-9０-９]{1,3}){1,5})(?:[.．。)、,:：;；\-—]|\s+)\s*/u,
    // Simple arabic numbering with punctuation, e.g. "1. ", "2) "
    /^(?:[0-9０-９]{1,3})(?:[.．。)、,:：;；\-—]|\)|\])\s*/u,
    // Simple short arabic numbering without punctuation, e.g. "1 "
    /^(?:[0-9０-９]{1,2})\s+/u,
    // Chinese numeral enumerations, e.g. "一、", "三."
    /^(?:[一二三四五六七八九十百千万零〇两]{1,8})(?:[、.．。:：;；\-—])\s*/u,
    // Chinese ordinal headings, e.g. "第3章 ", "第二节："
    /^第(?:[0-9０-９]{1,3}|[一二三四五六七八九十百千万零〇两]{1,8})(?:章|节|条|部分|篇|卷|回|课|讲)(?:[、.．。:：;；\-—])?\s*/u,
    // Roman numerals, e.g. "IV. ", "iii) "
    /^(?:[IVXLCDMivxlcdm]{1,8})(?:[.．。)、,:：;；\-—]|\)|\])\s*/u,
    // Alphabet enumerations, e.g. "A. ", "b) "
    /^(?:[A-Za-z])(?:[.．。)、,:：;；\-—]|\)|\])\s*/u,
    // English style chapter/section/part prefixes.
    /^(?:chapter|section|part)\s+(?:[0-9]{1,3}|[IVXLCDMivxlcdm]{1,8})(?:[.．。:：;；\-—])?\s*/iu,
];

function stripOnePrefix(text: string): string {
    for (const pattern of PREFIX_PATTERNS) {
        const next = text.replace(pattern, "");
        if (next !== text) {
            return next;
        }
    }
    return text;
}

export function stripHeadingNumberPrefix(content: string): string {
    if (!content) {
        return content;
    }

    const leadingWhitespace = (content.match(/^\s*/u) || [""])[0];
    let body = content.slice(leadingWhitespace.length);
    // Remove common invisible marker chars that may be left around numbered headings.
    body = body.replace(/^[\u200b-\u200d\u2063\u2064]+/u, "");

    let rounds = 0;
    while (rounds < 8) {
        const next = stripOnePrefix(body);
        if (next === body) {
            break;
        }
        body = next.replace(/^\s+/u, "");
        rounds++;
    }

    return `${leadingWhitespace}${body}`;
}
