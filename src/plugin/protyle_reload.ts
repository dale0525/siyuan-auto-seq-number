export interface IReloadableProtyleLike {
    reload?: (focus: boolean) => void;
    protyle?: IReloadableProtyleLike;
    model?: {
        editor?: IReloadableProtyleLike;
    };
}

export function reloadActiveProtyleView(
    protyle: IReloadableProtyleLike | null,
    focus: boolean
): boolean {
    const candidates = [
        protyle,
        protyle?.protyle,
        protyle?.model?.editor,
        protyle?.model?.editor?.protyle,
    ];

    for (const candidate of candidates) {
        if (typeof candidate?.reload !== "function") {
            continue;
        }

        candidate.reload(focus);
        return true;
    }

    return false;
}
