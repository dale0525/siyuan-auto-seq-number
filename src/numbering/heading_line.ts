export interface IHeadingLineParts {
    prefix: string;
    content: string;
    level: number;
}

export function splitHeadingLine(markdown: string): IHeadingLineParts | null {
    const matched = markdown.match(/^(\s*#{1,6}\s*)([\s\S]*)$/);
    if (!matched) {
        return null;
    }

    const level = (matched[1].match(/#/g) || []).length;
    return {
        prefix: matched[1],
        content: matched[2],
        level,
    };
}
