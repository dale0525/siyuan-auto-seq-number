interface ISiyuanResponse {
    code: number;
    msg: string;
    data: unknown;
}

async function requestUpdateBlock(
    id: string,
    data: string,
    fetchImpl: typeof fetch
): Promise<void> {
    const response = await fetchImpl("/api/block/updateBlock", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id,
            data,
            dataType: "dom",
        }),
    });

    if (!response.ok) {
        throw new Error(`updateBlock failed: ${id}`);
    }

    const json = (await response.json()) as ISiyuanResponse;
    if (json.code !== 0) {
        throw new Error(`updateBlock returned error: ${id} ${json.msg}`);
    }
}

export async function updateDomBlocksDirectly(
    updates: Record<string, string>,
    fetchImpl: typeof fetch = fetch
): Promise<void> {
    await Promise.all(
        Object.entries(updates).map(async ([id, data]) => {
            await requestUpdateBlock(id, data, fetchImpl);
        })
    );
}
