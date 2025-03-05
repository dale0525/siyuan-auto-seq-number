export function setCursorToEnd(element) {
    // 使用setTimeout确保在DOM更新后执行
    setTimeout(() => {
        // 获取编辑区域元素
        const contentElement = element.querySelector('[contenteditable="true"]');
        if (contentElement) {
            // 聚焦到编辑区域
            contentElement.focus();
            // 将光标移动到末尾
            const range = document.createRange();
            range.selectNodeContents(contentElement);
            range.collapse(false);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    }, 10);
}
//# sourceMappingURL=dom_operate.js.map