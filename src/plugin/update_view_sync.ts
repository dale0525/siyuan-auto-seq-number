export type UpdateTrigger = "manual-toggle" | "realtime" | "load";

export function shouldReloadActiveViewAfterUpdate(
    trigger: UpdateTrigger
): boolean {
    return trigger === "manual-toggle";
}
