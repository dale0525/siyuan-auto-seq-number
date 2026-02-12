export interface IRealtimeInputSnapshot {
    isHeadingNode: boolean;
    textContent: string;
}

export function shouldQueueRealtimeUpdateFromInput(
    snapshot: IRealtimeInputSnapshot
): boolean {
    if (snapshot.isHeadingNode) {
        return true;
    }

    return /(^|\n)\s{0,3}#{1,6}\s/.test(snapshot.textContent);
}
