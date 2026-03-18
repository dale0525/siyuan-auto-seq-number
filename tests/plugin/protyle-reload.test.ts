import test from "node:test";
import assert from "node:assert/strict";

import { reloadActiveProtyleView } from "../../src/plugin/protyle_reload";

test("reloadActiveProtyleView calls direct reload when available", () => {
    const calls: boolean[] = [];
    const protyle = {
        reload(focus: boolean) {
            calls.push(focus);
        },
    };

    const reloaded = reloadActiveProtyleView(protyle, false);

    assert.equal(reloaded, true);
    assert.deepEqual(calls, [false]);
});

test("reloadActiveProtyleView falls back to nested editor reload", () => {
    const calls: boolean[] = [];
    const protyle = {
        model: {
            editor: {
                reload(focus: boolean) {
                    calls.push(focus);
                },
            },
        },
    };

    const reloaded = reloadActiveProtyleView(protyle, true);

    assert.equal(reloaded, true);
    assert.deepEqual(calls, [true]);
});

test("reloadActiveProtyleView returns false when no reload hook exists", () => {
    assert.equal(reloadActiveProtyleView({}, false), false);
    assert.equal(reloadActiveProtyleView(null, false), false);
});
