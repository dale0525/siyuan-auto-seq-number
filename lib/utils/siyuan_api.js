// 封装fetch请求，用于与思源笔记API交互
export async function fetchSyncPost(url, data) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}
// 修改块的内容
export async function updateBlockDom(blockId, content) {
    try {
        await fetchSyncPost("/api/block/updateBlock", {
            id: blockId,
            data: content,
            dataType: "dom"
        });
    }
    catch (error) {
        console.error("更新块内容失败:", error);
    }
}
/**
 * 批量修改块内容
 * @param updates 块ID和内容的键值对对象 {blockId: content}
 */
export async function batchUpdateBlockDom(updates) {
    try {
        const promises = Object.keys(updates).map((blockId) => fetchSyncPost("/api/block/updateBlock", {
            id: blockId,
            data: updates[blockId],
            dataType: "dom"
        }));
        await Promise.all(promises);
    }
    catch (error) {
        console.error("批量更新块内容失败:", error);
    }
}
// 获取块的内容
export async function getBlockDom(blockId) {
    try {
        const response = await fetchSyncPost("/api/block/getBlockDOM", {
            id: blockId
        });
        const content = response.data.dom;
        return content;
    }
    catch (error) {
        console.error("获取块内容失败:", error);
        return null;
    }
}
/**
 * 批量获取块内容
 * @param blockIds 块ID数组
 * @returns 块ID和内容的Map
 */
export async function batchGetBlockDom(blockIds) {
    const result = new Map();
    // 每次批量处理的数量
    const batchSize = 30;
    try {
        // 分批处理请求
        for (let i = 0; i < blockIds.length; i += batchSize) {
            const batchIds = blockIds.slice(i, i + batchSize);
            const promises = batchIds.map(id => fetchSyncPost("/api/block/getBlockDOM", { id })
                .then(response => ({ id, dom: response.data.dom })));
            const batchResults = await Promise.all(promises);
            for (const { id, dom } of batchResults) {
                if (dom) {
                    result.set(id, dom);
                }
            }
        }
        return result;
    }
    catch (error) {
        console.error("批量获取块内容失败:", error);
        return result;
    }
}
export async function getBlockAttrs(blockId) {
    const response = await fetchSyncPost("/api/attr/getBlockAttrs", {
        id: blockId
    });
    return response.data;
}
/**
 * 批量获取块属性
 * @param blockIds 块ID数组
 * @returns 块ID和属性的Map
 */
export async function batchGetBlockAttrs(blockIds) {
    const result = new Map();
    // 每次批量处理的数量
    const batchSize = 30;
    try {
        // 分批处理请求
        for (let i = 0; i < blockIds.length; i += batchSize) {
            const batchIds = blockIds.slice(i, i + batchSize);
            const promises = batchIds.map(id => fetchSyncPost("/api/attr/getBlockAttrs", { id })
                .then(response => ({ id, attrs: response.data })));
            const batchResults = await Promise.all(promises);
            for (const { id, attrs } of batchResults) {
                result.set(id, attrs);
            }
        }
        return result;
    }
    catch (error) {
        console.error("批量获取块属性失败:", error);
        return result;
    }
}
export async function setBlockAttrs(blockId, attrs) {
    await fetchSyncPost("/api/attr/setBlockAttrs", {
        id: blockId,
        attrs: attrs
    });
}
/**
 * 批量设置块属性
 * @param attrsMap 块ID和属性对象的Map
 */
export async function batchSetBlockAttrs(attrsMap) {
    try {
        const promises = Array.from(attrsMap.entries()).map(([blockId, attrs]) => fetchSyncPost("/api/attr/setBlockAttrs", {
            id: blockId,
            attrs: attrs
        }));
        await Promise.all(promises);
    }
    catch (error) {
        console.error("批量设置块属性失败:", error);
    }
}
//# sourceMappingURL=siyuan_api.js.map