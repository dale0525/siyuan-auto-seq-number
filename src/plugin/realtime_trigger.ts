export interface IRealtimeOperationLike {
    action?: string;
    data?: unknown;
}

export interface IRealtimeUpdateDecision {
    nextShouldUpdate: boolean;
    shouldQueue: boolean;
}

function isHeadingOperation(operation: IRealtimeOperationLike): boolean {
    const rawData =
        typeof operation.data === "string"
            ? operation.data
            : JSON.stringify(operation.data ?? "");
    return (
        /data-subtype="h[1-6]"/.test(rawData) ||
        /data-type="NodeHeading"/.test(rawData) ||
        /(^|\n)\s{0,3}#{1,6}\s/.test(rawData)
    );
}

function isQueueableAction(operation: IRealtimeOperationLike): boolean {
    return operation.action === "insert" || operation.action === "update";
}

export function resolveRealtimeUpdateDecision(
    operation: IRealtimeOperationLike,
    currentShouldUpdate: boolean
): IRealtimeUpdateDecision {
    const headingOperation = isHeadingOperation(operation);
    const nextShouldUpdate = currentShouldUpdate || headingOperation;
    const shouldQueue = nextShouldUpdate && isQueueableAction(operation);

    return {
        nextShouldUpdate,
        shouldQueue,
    };
}
