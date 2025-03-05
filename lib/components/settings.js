import { Setting } from "siyuan";
export class SettingsPanel {
    constructor(plugin) {
        this.plugin = plugin;
        this.settingPanel = new Setting({
            confirmCallback: () => {
                this.saveSettings();
            }
        });
        this.initPanel();
    }
    initPanel() {
        // 添加全局启用设置
        this.addGlobalEnableSetting();
        // 添加标题级别设置
        this.addHeaderLevelSettings();
        // 添加重置按钮
        this.addResetButton();
    }
    addGlobalEnableSetting() {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.plugin.config.defaultEnabled;
        this.settingPanel.addItem({
            title: '默认启用',
            description: '新文档是否默认启用自动编号',
            createActionElement: () => {
                const container = document.createElement('div');
                container.appendChild(checkbox);
                return container;
            }
        });
    }
    addHeaderLevelSettings() {
        for (let i = 0; i < 6; i++) {
            const formatInput = document.createElement('input');
            formatInput.type = 'text';
            formatInput.value = this.plugin.config.formats[i];
            formatInput.placeholder = '例如: {1}. ';
            const chineseCheckbox = document.createElement('input');
            chineseCheckbox.type = 'checkbox';
            chineseCheckbox.checked = this.plugin.config.useChineseNumbers[i];
            this.settingPanel.addItem({
                title: `h${i + 1} 标题格式`,
                description: i === 0 ? '使用 {1}, {2} 等作为序号占位符' : '',
                createActionElement: () => {
                    const container = document.createElement('div');
                    container.className = 'fn__flex';
                    const formatContainer = document.createElement('div');
                    formatContainer.className = 'fn__flex-1';
                    formatContainer.appendChild(formatInput);
                    const checkboxContainer = document.createElement('div');
                    checkboxContainer.className = 'fn__flex-1';
                    const label = document.createElement('label');
                    label.textContent = '使用中文数字';
                    label.appendChild(chineseCheckbox);
                    checkboxContainer.appendChild(label);
                    container.appendChild(formatContainer);
                    container.appendChild(checkboxContainer);
                    return container;
                }
            });
        }
    }
    addResetButton() {
        this.settingPanel.addItem({
            title: '重置设置',
            description: '将所有设置恢复为默认值',
            createActionElement: () => {
                const button = document.createElement('button');
                button.className = 'b3-button b3-button--outline';
                button.textContent = '重置';
                button.addEventListener('click', () => {
                    this.resetSettings();
                });
                return button;
            }
        });
    }
    async saveSettings() {
        // 获取所有输入值并进行类型转换
        const formatInputs = Array.from(document.querySelectorAll('input[type="text"]')).map(input => input);
        const chineseCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]')).map(checkbox => checkbox);
        const globalEnabled = chineseCheckboxes[0].checked;
        // 更新配置
        this.plugin.config.defaultEnabled = globalEnabled;
        this.plugin.config.formats = formatInputs.map(input => input.value);
        this.plugin.config.useChineseNumbers = chineseCheckboxes.slice(1).map(cb => cb.checked);
        // 保存配置
        await this.plugin.saveConfig();
    }
    async resetSettings() {
        // 确认对话框
        if (await confirm('确定要重置所有设置吗？')) {
            // 重置配置
            this.plugin.config = {
                formats: [
                    '{1}. ',
                    '{1}.{2} ',
                    '{1}.{2}.{3} ',
                    '{1}.{2}.{3}.{4} ',
                    '{1}.{2}.{3}.{4}.{5} ',
                    '{1}.{2}.{3}.{4}.{5}.{6} '
                ],
                useChineseNumbers: [false, false, false, false, false, false],
                defaultEnabled: true,
                docEnableStatus: {}
            };
            // 保存配置
            await this.plugin.saveConfig();
            // 刷新面板
            this.initPanel();
        }
    }
}
//# sourceMappingURL=settings.js.map