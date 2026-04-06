import test from "node:test";
import assert from "node:assert/strict";

import { createSiyuanApi } from "../../src/infra/siyuan_api";

type IFetchCall = {
    url: string;
    body: unknown;
};

function createFakeFetch(version = "3.1.24") {
    const calls: IFetchCall[] = [];

    const fakeFetch: typeof fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit
    ) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ url, body });

        if (url === "/api/system/version") {
            return new Response(
                JSON.stringify({
                    code: 0,
                    msg: "",
                    data: version,
                }),
                { status: 200 }
            );
        }

        if (url === "/api/query/sql") {
            return new Response(
                JSON.stringify({
                    code: 0,
                    msg: "",
                    data: [
                        {
                            id: "a",
                            markdown: "# A",
                            subtype: "h1",
                            ial: '{: custom-auto-seq-number="1. " custom-auto-seq-number-backup-prefix=""}',
                        },
                        { id: "b", markdown: "## B", subtype: "h2", ial: "" },
                    ],
                }),
                { status: 200 }
            );
        }

        if (
            url === "/api/block/updateBlock" ||
            url === "/api/block/batchUpdateBlock" ||
            url === "/api/sqlite/flushTransaction" ||
            url === "/api/attr/setBlockAttrs"
        ) {
            return new Response(
                JSON.stringify({
                    code: 0,
                    msg: "",
                    data: null,
                }),
                { status: 200 }
            );
        }

        return new Response(JSON.stringify({ code: -1, msg: "unknown", data: null }), {
            status: 404,
        });
    }) as typeof fetch;

    return {
        calls,
        fetch: fakeFetch,
    };
}

function createFakeFetchTypeSensitive(version = "3.1.25") {
    const calls: IFetchCall[] = [];

    const fakeFetch: typeof fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit
    ) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ url, body });

        if (url === "/api/system/version") {
            return new Response(
                JSON.stringify({
                    code: 0,
                    msg: "",
                    data: version,
                }),
                { status: 200 }
            );
        }

        if (url === "/api/query/sql") {
            const stmt = String((body as { stmt?: unknown })?.stmt || "");
            const hasTypeH = stmt.includes("type = 'h'");
            const hasSubtypeFilter = /subtype\s+in\s*\(/i.test(stmt);
            const data = !hasTypeH && hasSubtypeFilter
                ? [{ id: "x", markdown: "# X", subtype: "h1", ial: "" }]
                : [];

            return new Response(
                JSON.stringify({
                    code: 0,
                    msg: "",
                    data,
                }),
                { status: 200 }
            );
        }

        if (
            url === "/api/block/updateBlock" ||
            url === "/api/block/batchUpdateBlock" ||
            url === "/api/sqlite/flushTransaction" ||
            url === "/api/attr/setBlockAttrs"
        ) {
            return new Response(
                JSON.stringify({
                    code: 0,
                    msg: "",
                    data: null,
                }),
                { status: 200 }
            );
        }

        return new Response(JSON.stringify({ code: -1, msg: "unknown", data: null }), {
            status: 404,
        });
    }) as typeof fetch;

    return {
        calls,
        fetch: fakeFetch,
    };
}

function createFakeFetchFlushUnsupported(version = "3.1.25") {
    const calls: IFetchCall[] = [];

    const fakeFetch: typeof fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit
    ) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ url, body });

        if (url === "/api/system/version") {
            return new Response(
                JSON.stringify({
                    code: 0,
                    msg: "",
                    data: version,
                }),
                { status: 200 }
            );
        }

        if (url === "/api/sqlite/flushTransaction") {
            return new Response("not found", { status: 404 });
        }

        return new Response(
            JSON.stringify({
                code: 0,
                msg: "",
                data: null,
            }),
            { status: 200 }
        );
    }) as typeof fetch;

    return {
        calls,
        fetch: fakeFetch,
    };
}

function createFakeFetchWithBatchFailure(version = "3.1.25") {
    const calls: IFetchCall[] = [];

    const fakeFetch: typeof fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit
    ) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ url, body });

        if (url === "/api/system/version") {
            return new Response(
                JSON.stringify({
                    code: 0,
                    msg: "",
                    data: version,
                }),
                { status: 200 }
            );
        }

        if (url === "/api/block/batchUpdateBlock") {
            return new Response(
                JSON.stringify({
                    code: -1,
                    msg: "batch failed",
                    data: null,
                }),
                { status: 200 }
            );
        }

        if (url === "/api/block/updateBlock") {
            return new Response(
                JSON.stringify({
                    code: 0,
                    msg: "",
                    data: null,
                }),
                { status: 200 }
            );
        }

        return new Response(JSON.stringify({ code: -1, msg: "unknown", data: null }), {
            status: 404,
        });
    }) as typeof fetch;

    return {
        calls,
        fetch: fakeFetch,
    };
}

function createFakeFetchWithAttrBatchRace() {
    const calls: IFetchCall[] = [];
    let resolvedA = false;
    let resolvedB = false;

    const fakeFetch: typeof fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit
    ) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ url, body });

        if (url !== "/api/attr/setBlockAttrs") {
            return new Response(
                JSON.stringify({
                    code: 0,
                    msg: "",
                    data: null,
                }),
                { status: 200 }
            );
        }

        const id = String((body as { id?: unknown })?.id || "");
        if (id === "a") {
            return new Promise<Response>((resolve) => {
                setTimeout(() => {
                    resolvedA = true;
                    resolve(
                        new Response(
                            JSON.stringify({
                                code: -1,
                                msg: "attr failed",
                                data: null,
                            }),
                            { status: 200 }
                        )
                    );
                }, 0);
            });
        }

        if (id === "b") {
            return new Promise<Response>((resolve) => {
                setTimeout(() => {
                    resolvedB = true;
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
        }

        return new Response(
            JSON.stringify({
                code: 0,
                msg: "",
                data: null,
            }),
            { status: 200 }
        );
    }) as typeof fetch;

    return {
        calls,
        fetch: fakeFetch,
        getResolvedState() {
            return { resolvedA, resolvedB };
        },
    };
}

function createFakeFetchWithoutHeadingAttrs() {
    const calls: IFetchCall[] = [];

    const fakeFetch: typeof fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit
    ) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ url, body });

        if (url === "/api/query/sql") {
            const stmt = String((body as { stmt?: unknown })?.stmt || "");
            if (stmt.includes("ial")) {
                return new Response(
                    JSON.stringify({
                        code: -1,
                        msg: "no such column: ial",
                        data: null,
                    }),
                    { status: 200 }
                );
            }

            return new Response(
                JSON.stringify({
                    code: 0,
                    msg: "",
                    data: [{ id: "a", markdown: "# A", subtype: "h1" }],
                }),
                { status: 200 }
            );
        }

        if (url === "/api/attr/setBlockAttrs") {
            return new Response(
                JSON.stringify({
                    code: -1,
                    msg: "attrs unsupported",
                    data: null,
                }),
                { status: 200 }
            );
        }

        return new Response(
            JSON.stringify({
                code: 0,
                msg: "",
                data: null,
            }),
            { status: 200 }
        );
    }) as typeof fetch;

    return {
        calls,
        fetch: fakeFetch,
    };
}

test("updateBlocks always uses batchUpdateBlock even when version < 3.1.25", async () => {
    const fake = createFakeFetch("3.1.24");
    const api = createSiyuanApi(fake.fetch);

    await api.updateBlocks(
        {
            a: "# A",
            b: "## B",
        },
        "markdown"
    );

    const calledUpdate = fake.calls.filter((call) => call.url === "/api/block/updateBlock");
    const calledBatch = fake.calls.filter(
        (call) => call.url === "/api/block/batchUpdateBlock"
    );
    assert.equal(calledUpdate.length, 0);
    assert.equal(calledBatch.length, 1);
});

test("updateBlocks uses batchUpdateBlock when version >= 3.1.25", async () => {
    const fake = createFakeFetch("3.1.25");
    const api = createSiyuanApi(fake.fetch);

    await api.updateBlocks(
        {
            a: "# A",
            b: "## B",
        },
        "markdown"
    );

    const calledUpdate = fake.calls.filter((call) => call.url === "/api/block/updateBlock");
    const calledBatch = fake.calls.filter(
        (call) => call.url === "/api/block/batchUpdateBlock"
    );
    assert.equal(calledUpdate.length, 0);
    assert.equal(calledBatch.length, 1);
});

test("flushTransactions calls /api/sqlite/flushTransaction", async () => {
    const fake = createFakeFetch();
    const api = createSiyuanApi(fake.fetch);
    await api.flushTransactions();

    const called = fake.calls.some(
        (call) => call.url === "/api/sqlite/flushTransaction"
    );
    assert.equal(called, true);
});

test("updateBlocks throws when batchUpdateBlock returns error", async () => {
    const fake = createFakeFetchWithBatchFailure("3.1.25");
    const api = createSiyuanApi(fake.fetch);

    await assert.rejects(
        () =>
            api.updateBlocks(
                {
                    a: "# A",
                    b: "## B",
                },
                "markdown"
            ),
        /batchUpdateBlock/
    );

    const calledUpdate = fake.calls.filter((call) => call.url === "/api/block/updateBlock");
    const calledBatch = fake.calls.filter(
        (call) => call.url === "/api/block/batchUpdateBlock"
    );
    assert.equal(calledBatch.length, 1);
    assert.equal(calledUpdate.length, 0);
});

test("getDocHeadingBlocks returns heading rows", async () => {
    const fake = createFakeFetch();
    const api = createSiyuanApi(fake.fetch);

    const blocks = await api.getDocHeadingBlocks("doc-id");
    assert.deepEqual(
        blocks.map((block) => block.id),
        ["a", "b"]
    );
    assert.equal(blocks[0].attrs?.["custom-auto-seq-number"], "1. ");
});

test("updateAttrs writes block attrs one block at a time", async () => {
    const fake = createFakeFetch();
    const api = createSiyuanApi(fake.fetch);

    await api.updateAttrs({
        a: {
            "custom-auto-seq-number": "1. ",
            "custom-auto-seq-number-backup-prefix": "",
        },
        b: {
            "custom-auto-seq-number": "1.1 ",
            "custom-auto-seq-number-backup-prefix": "",
        },
    });

    const calls = fake.calls.filter((call) => call.url === "/api/attr/setBlockAttrs");
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].body, {
        id: "a",
        attrs: {
            "custom-auto-seq-number": "1. ",
            "custom-auto-seq-number-backup-prefix": "",
        },
    });
});

test("updateAttrs waits for the whole batch before rejecting", async () => {
    const fake = createFakeFetchWithAttrBatchRace();
    const api = createSiyuanApi(fake.fetch);

    await assert.rejects(
        () =>
            api.updateAttrs({
                a: {
                    "custom-auto-seq-number": "1. ",
                    "custom-auto-seq-number-backup-prefix": "",
                },
                b: {
                    "custom-auto-seq-number": "2. ",
                    "custom-auto-seq-number-backup-prefix": "",
                },
            }),
        /attr failed/
    );

    assert.deepEqual(fake.getResolvedState(), {
        resolvedA: true,
        resolvedB: true,
    });
});

test("getDocHeadingBlocks uses subtype-based SQL filter for compatibility", async () => {
    const fake = createFakeFetchTypeSensitive();
    const api = createSiyuanApi(fake.fetch);

    const blocks = await api.getDocHeadingBlocks("doc-id");
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].id, "x");
});

test("flushTransactions is best-effort when endpoint is unavailable", async () => {
    const fake = createFakeFetchFlushUnsupported();
    const api = createSiyuanApi(fake.fetch);

    await api.flushTransactions();
    const called = fake.calls.some(
        (call) => call.url === "/api/sqlite/flushTransaction"
    );
    assert.equal(called, true);
});

test("getDocHeadingBlocks falls back when ial column is unavailable", async () => {
    const fake = createFakeFetchWithoutHeadingAttrs();
    const api = createSiyuanApi(fake.fetch);

    const blocks = await api.getDocHeadingBlocks("doc-id");

    assert.equal(blocks.length, 1);
    assert.deepEqual(blocks[0].attrs, {});
    assert.equal(api.supportsAttributeNumberingState(), false);
});

test("updateAttrs marks attribute numbering state unsupported when endpoint fails", async () => {
    const fake = createFakeFetchWithoutHeadingAttrs();
    const api = createSiyuanApi(fake.fetch);

    await assert.rejects(
        () =>
            api.updateAttrs({
                a: {
                    "custom-auto-seq-number": "1. ",
                    "custom-auto-seq-number-backup-prefix": "",
                },
            }),
        /unsupported/
    );

    assert.equal(api.supportsAttributeNumberingState(), false);
});

test("updateAttrs keeps attribute numbering state enabled for generic endpoint errors", async () => {
    const api = createSiyuanApi(async (input) => {
        if (String(input) === "/api/attr/setBlockAttrs") {
            return new Response(
                JSON.stringify({
                    code: -1,
                    msg: "unknown error",
                    data: null,
                }),
                { status: 200 }
            );
        }

        return new Response(
            JSON.stringify({
                code: 0,
                msg: "",
                data: [],
            }),
            { status: 200 }
        );
    });

    await assert.rejects(
        () =>
            api.updateAttrs({
                a: {
                    "custom-auto-seq-number": "1. ",
                    "custom-auto-seq-number-backup-prefix": "",
                },
            }),
        /unknown error/
    );

    assert.equal(api.supportsAttributeNumberingState(), true);
});

test("getDocHeadingBlocks keeps reading ial attrs after attr writes become unsupported", async () => {
    const fake = createFakeFetch();
    const api = createSiyuanApi(async (input, init) => {
        const url = String(input);
        if (url === "/api/attr/setBlockAttrs") {
            return new Response(
                JSON.stringify({
                    code: -1,
                    msg: "attrs unsupported",
                    data: null,
                }),
                { status: 200 }
            );
        }

        return fake.fetch(input, init);
    });

    await assert.rejects(
        () =>
            api.updateAttrs({
                a: {
                    "custom-auto-seq-number": "1. ",
                    "custom-auto-seq-number-backup-prefix": "",
                },
            }),
        /unsupported/
    );

    const blocks = await api.getDocHeadingBlocks("doc-id");

    assert.equal(api.supportsAttributeNumberingState(), false);
    assert.equal(blocks[0].attrs?.["custom-auto-seq-number"], "1. ");
});
