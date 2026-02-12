import test from "node:test";
import assert from "node:assert/strict";

import { updateDomBlocksDirectly } from "../../src/plugin/dom_block_updater";

test("updateDomBlocksDirectly calls updateBlock for each item", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const fakeFetch: typeof fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit
    ) => {
        calls.push({
            url: String(input),
            body: init?.body ? JSON.parse(String(init.body)) : undefined,
        });
        return new Response(
            JSON.stringify({
                code: 0,
                msg: "",
                data: null,
            }),
            { status: 200 }
        );
    }) as typeof fetch;

    await updateDomBlocksDirectly(
        {
            a: "<div>A</div>",
            b: "<div>B</div>",
        },
        fakeFetch
    );

    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, "/api/block/updateBlock");
    assert.equal(calls[1].url, "/api/block/updateBlock");
});

test("updateDomBlocksDirectly sends requests concurrently", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fakeFetch: typeof fetch = (() => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return new Promise((resolve) => {
            setTimeout(() => {
                inFlight--;
                resolve(
                    new Response(
                        JSON.stringify({
                            code: 0,
                            msg: "",
                            data: null,
                        }),
                        { status: 200 }
                    )
                );
            }, 10);
        });
    }) as typeof fetch;

    await updateDomBlocksDirectly(
        {
            a: "<div>A</div>",
            b: "<div>B</div>",
            c: "<div>C</div>",
        },
        fakeFetch
    );

    assert.equal(maxInFlight > 1, true);
});
