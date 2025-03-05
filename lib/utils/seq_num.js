export function getSeqNumber(level, counters, seqNumConfigs, num2ChiConfigs) {
    // 重置所有更高级别的计数器
    for (let j = level; j < counters.length; j++) {
        counters[j] = 0;
    }
    // 增加当前级别的计数器
    counters[level - 1]++;
    // 获取有效标题级别数量
    let trueCounters = [];
    let trueLevel = 0;
    for (let j = 0; j < level; j++) {
        if (counters[j] > 0) {
            trueCounters.push(counters[j]);
            trueLevel++;
        }
    }
    // 生成编号
    const seqNumConfig = seqNumConfigs[trueLevel - 1];
    const num2ChiConfig = num2ChiConfigs[trueLevel - 1];
    let seqNum = seqNumConfig;
    for (let j = 0; j < trueLevel; j++) {
        let numStr = trueCounters[j].toString();
        seqNum = seqNum.replace(`{${j + 1}}`, num2ChiConfig ? num2Chi(numStr) : numStr);
    }
    return [seqNum, counters];
}
export function num2Chi(numStr) {
    let num = parseInt(numStr);
    const chineseNumerals = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
    const unitPositions = ["", "十", "百"];
    let result = "";
    // 将数字转为字符串，便于遍历每一位
    for (let i = 0; i < numStr.length; i++) {
        const digit = parseInt(numStr[i]);
        // 处理零
        if (digit !== 0) {
            result += chineseNumerals[digit] + unitPositions[numStr.length - i - 1];
        }
        else {
            // 连续多个零时，只保留一个零
            if (result.charAt(result.length - 1) !== "零") {
                result += "零";
            }
        }
    }
    // 去除末尾的零
    result = result.replace(/零+$/, "");
    return result;
}
export function isHeaderText(text) {
    if (!text || typeof text !== 'string') {
        return 0;
    }
    // 匹配h1-h6中的数字
    const match = text.match(/^h([1-6])/);
    if (match) {
        return parseInt(match[1]);
    }
    return 0;
}
//# sourceMappingURL=seq_num.js.map