import test from "node:test";
import assert from "node:assert/strict";

import { resolveDynamicLoadingPolicy } from "../../src/plugin/dynamic_loading_policy";

test("document-backed updates disable loaded DOM fallback", () => {
    const policy = resolveDynamicLoadingPolicy("doc-1");

    assert.equal(policy.useDocumentSourceWhenAvailable, true);
    assert.equal(policy.allowLoadedDomFallback, false);
});

test("detached editor keeps loaded DOM fallback", () => {
    const policy = resolveDynamicLoadingPolicy(null);

    assert.equal(policy.useDocumentSourceWhenAvailable, false);
    assert.equal(policy.allowLoadedDomFallback, true);
});
