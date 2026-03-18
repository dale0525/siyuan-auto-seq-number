import test from "node:test";
import assert from "node:assert/strict";

import { resolveDynamicLoadingPolicy } from "../../src/plugin/dynamic_loading_policy";

test("document-backed updates disable loaded DOM fallback", () => {
    const policy = resolveDynamicLoadingPolicy("doc-1");

    assert.equal(policy.useDocumentSourceWhenAvailable, true);
    assert.equal(policy.allowLoadedDomFallbackForUpdate, false);
    assert.equal(policy.allowLoadedDomFallbackForClear, true);
    assert.equal(policy.allowLoadedDomFallbackForClearAll, true);
});

test("detached editor keeps loaded DOM fallback", () => {
    const policy = resolveDynamicLoadingPolicy(null);

    assert.equal(policy.useDocumentSourceWhenAvailable, false);
    assert.equal(policy.allowLoadedDomFallbackForUpdate, true);
    assert.equal(policy.allowLoadedDomFallbackForClear, true);
    assert.equal(policy.allowLoadedDomFallbackForClearAll, true);
});
