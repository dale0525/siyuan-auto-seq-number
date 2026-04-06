export type UpdateTrigger = "manual-toggle" | "realtime" | "load";

export function shouldSyncLoadedViewAfterUpdate(
    trigger: UpdateTrigger
): boolean {
    void trigger;
    return true;
}
