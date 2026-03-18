export type UpdateTrigger = "manual-toggle" | "realtime" | "load";

export function shouldSyncLoadedViewAfterUpdate(
    _trigger: UpdateTrigger
): boolean {
    return true;
}
