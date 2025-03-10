import { Plugin, Setting, showMessage } from "siyuan";
import { setCursorToEnd } from "./utils/dom_operate";
import { IPluginConfig } from "./types";
import {
    generateHeaderNumber,
    getHeaderLevel,
    hasHeaderNumber,
    removeHeaderNumber,
} from "./utils/header_utils";
import { batchUpdateBlockContent } from "./utils/api";
import "./style.scss";

// 存储配置的键名
const STORAGE_NAME = "auto-seq-number";

// 默认配置
const DEFAULT_CONFIG: IPluginConfig = {
    formats: [
        "{1}. ", // h1
        "{1}.{2} ", // h2
        "{1}.{2}.{3} ", // h3
        "{1}.{2}.{3}.{4} ", // h4
        "{1}.{2}.{3}.{4}.{5} ", // h5
        "{1}.{2}.{3}.{4}.{5}.{6} ", // h6
    ],
    useChineseNumbers: [false, false, false, false, false, false],
    defaultEnabled: true,
    realTimeUpdate: false,
    docEnableStatus: {},
};

export default class HeaderNumberPlugin extends Plugin {
    public config!: IPluginConfig;
    private statusElement!: HTMLElement;
    private updateTimer: number | null = null;
    private lastInputTime: number = 0;
    private activeDocId: string | null = null;
    private activeProtyle: any;
    private shouldUpdate: boolean = false;
    private activeBlockId: string | null = null;

    async onload() {
        // 加载配置
        this.config = await this.loadConfig();

        // 初始化设置面板
        this.setting = new Setting({
            confirmCallback: () => {
                this.saveConfig();
            },
        });

        const settingsContainer = document.createElement("div");
        settingsContainer.className = "auto-seq-number-settings";

        // 添加全局启用设置
        this.setting.addItem({
            title: this.i18n.defaultEnabled,
            description: this.i18n.defaultEnabledDesc,
            createActionElement: () => {
                const container = document.createElement("div");
                container.className = "setting-item";

                const checkboxWrapper = document.createElement("div");
                checkboxWrapper.className = "checkbox-wrapper";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = this.config.defaultEnabled;
                checkbox.addEventListener("change", () => {
                    this.config.defaultEnabled = checkbox.checked;
                });

                const label = document.createElement("label");
                label.textContent = this.i18n.defaultEnabled;

                checkboxWrapper.appendChild(checkbox);
                checkboxWrapper.appendChild(label);
                container.appendChild(checkboxWrapper);
                return container;
            },
        });

        // 添加实时更新设置
        this.setting.addItem({
            title: this.i18n.realTimeUpdate,
            description: this.i18n.realTimeUpdateDesc,
            createActionElement: () => {
                const container = document.createElement("div");
                container.className = "setting-item";

                const checkboxWrapper = document.createElement("div");
                checkboxWrapper.className = "checkbox-wrapper";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = this.config.realTimeUpdate;
                checkbox.addEventListener("change", () => {
                    this.config.realTimeUpdate = checkbox.checked;
                });

                const label = document.createElement("label");
                label.textContent = this.i18n.realTimeUpdate;

                checkboxWrapper.appendChild(checkbox);
                checkboxWrapper.appendChild(label);
                container.appendChild(checkboxWrapper);
                return container;
            },
        });

        // 添加标题级别设置
        for (let i = 0; i < 6; i++) {
            this.setting.addItem({
                title: this.i18n.headerFormat.replace(
                    "{1}",
                    (i + 1).toString()
                ),
                description: i === 0 ? this.i18n.headerFormatDesc : "",
                createActionElement: () => {
                    const container = document.createElement("div");
                    container.className = "setting-item";

                    const input = document.createElement("input");
                    input.type = "text";
                    input.className = "format-input";
                    input.value = this.config.formats[i];
                    input.placeholder = "例如: 第{1}章";
                    input.addEventListener("change", () => {
                        this.config.formats[i] = input.value;
                    });

                    const checkboxWrapper = document.createElement("div");
                    checkboxWrapper.className = "checkbox-wrapper";

                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.checked = this.config.useChineseNumbers[i];
                    checkbox.addEventListener("change", () => {
                        this.config.useChineseNumbers[i] = checkbox.checked;
                    });

                    const label = document.createElement("label");
                    label.textContent = this.i18n.useChineseNumbers;

                    checkboxWrapper.appendChild(checkbox);
                    checkboxWrapper.appendChild(label);

                    container.appendChild(input);
                    container.appendChild(checkboxWrapper);
                    return container;
                },
            });
        }

        // 添加重置按钮
        this.setting.addItem({
            title: this.i18n.resetConfig,
            description: this.i18n.resetConfigDesc,
            createActionElement: () => {
                const button = document.createElement("button");
                button.className = "reset-button";
                button.textContent = this.i18n.resetBtn;
                button.addEventListener("click", async () => {
                    this.config = {
                        formats: [
                            "{1}. ",
                            "{1}.{2} ",
                            "{1}.{2}.{3} ",
                            "{1}.{2}.{3}.{4} ",
                            "{1}.{2}.{3}.{4}.{5} ",
                            "{1}.{2}.{3}.{4}.{5}.{6} ",
                        ],
                        useChineseNumbers: [
                            false,
                            false,
                            false,
                            false,
                            false,
                            false,
                        ],
                        defaultEnabled: true,
                        realTimeUpdate: false,
                        docEnableStatus:
                            this.data[STORAGE_NAME].docEnableStatus, //不删除保存的单独文档设置
                    };
                    await this.saveConfig();
                    showMessage(this.i18n.settingsResetSuccess);
                    globalThis.location.reload();
                });

                return button;
            },
        });

        // 初始化状态栏
        this.initStatusBar();

        // 初始化顶部工具栏
        this.initTopBar();

        // 监听编辑器加载事件
        this.eventBus.on("loaded-protyle-dynamic", this.onProtyleLoaded);
        this.eventBus.on("loaded-protyle-static", this.onProtyleLoaded);
        this.eventBus.on("switch-protyle", this.onDocSwitch);
        if (this.config.realTimeUpdate) {
            this.eventBus.on("ws-main", this.onEdited);
        }
    }

    async onunload() {
        // 清理定时器
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }
        // 移除事件监听
        this.eventBus.off("loaded-protyle-dynamic", this.onProtyleLoaded);
        this.eventBus.off("loaded-protyle-static", this.onProtyleLoaded);
        if (this.config.realTimeUpdate) {
            this.eventBus.off("ws-main", this.onEdited);
        }
        this.eventBus.off("switch-protyle", this.onDocSwitch);
        this.shouldUpdate = false;
        this.activeBlockId = null;
    }

    private async loadConfig(): Promise<IPluginConfig> {
        let config = Object.assign({}, DEFAULT_CONFIG);
        const stored = await this.loadData(STORAGE_NAME);
        if (stored) {
            // 如果存在配置的键值，则将配置的键值赋值给config
            config = Object.assign(config, stored);
        }
        return config;
    }

    public async saveConfig() {
        await this.saveData(STORAGE_NAME, this.config);
    }

    private initStatusBar() {
        this.statusElement = document.createElement("div");
        this.statusElement.className = "status__counter";
        this.statusElement.innerHTML = this.i18n.statusDisabled;
        this.addStatusBar({
            element: this.statusElement,
        });
    }

    private changeDocEnableStatus(enabled: boolean | null) {
        if (!this.activeDocId) {
            this.statusElement.innerHTML = "";
            return;
        }
        if (enabled === null) {
            this.statusElement.innerHTML = "";
            return;
        }
        if (enabled) {
            this.enableDoc(this.activeDocId);
            this.statusElement.innerHTML = this.i18n.statusEnabled;
        } else {
            this.disableDoc(this.activeDocId);
            this.statusElement.innerHTML = this.i18n.statusDisabled;
        }
    }

    private initTopBar() {
        // 添加标题序号切换按钮
        this.addTopBar({
            icon: "iconList",
            title: this.i18n.toggleHeaderNumber,
            callback: async () => {
                if (this.isDocEnabled(this.activeDocId)) {
                    await this.clearDocNumbering(this.activeProtyle);
                    showMessage(this.i18n.numberingDisabled);
                    this.disableDoc(this.activeDocId);
                } else {
                    await this.updateDocNumbering(this.activeProtyle);
                    showMessage(this.i18n.numberingEnabled);
                    this.enableDoc(this.activeDocId);
                }
            },
        });
    }

    private onProtyleLoaded = async (e: CustomEvent) => {
        this.activeProtyle = e.detail.protyle;
        this.activeDocId = this.getDocId(this.activeProtyle);
        if (!this.activeDocId) return;
        // 检查文档是否启用了序号
        if (this.isDocEnabled(this.activeDocId)) {
            await this.updateDocNumbering(this.activeProtyle);
        }
    };

    private onEdited = async (e: CustomEvent) => {
        this.lastInputTime = Date.now();
        if (!this.activeDocId) return;
        if (!e.detail || !e.detail.cmd || e.detail.cmd !== "transactions")
            return;
        for (const transaction of e.detail.data) {
            for (const operation of transaction.doOperations) {
                if (operation.action === "insert") {
                    this.activeBlockId = operation.id;
                }
                if (!this.shouldUpdate) {
                    const blockHtml = operation.data;
                    // 检查是否是标题
                    if (/data-subtype="h\d"/.test(blockHtml)) {
                        this.shouldUpdate = true;
                    }
                }
                if (operation.action === "insert" && this.shouldUpdate) {
                    this.queueUpdate();
                }
            }
        }
    };

    private onDocSwitch = (e: CustomEvent) => {
        this.activeProtyle = e.detail.protyle;
        this.activeDocId = this.getDocId(this.activeProtyle);
        if (!this.activeDocId) {
            this.changeDocEnableStatus(null);
            return;
        }
        if (this.isDocEnabled(this.activeDocId)) {
            this.changeDocEnableStatus(true);
        } else {
            this.changeDocEnableStatus(false);
        }
    };

    private queueUpdate() {
        this.removeTimer();

        // 设置新的定时器
        this.updateTimer = window.setTimeout(async () => {
            // 检查是否距离最后一次输入已经过去2秒
            if (Date.now() - this.lastInputTime >= 2000) {
                if (this.shouldUpdate) {
                    await this.updateDocNumbering(this.activeProtyle);
                }
            } else {
                // 如果还没到2秒，重新设置定时器
                this.queueUpdate();
            }
        }, 2000) as unknown as number;
    }

    private isDocEnabled(docId: string | null): boolean {
        if (!docId) return false;
        return docId in this.config.docEnableStatus
            ? this.config.docEnableStatus[docId]
            : this.config.defaultEnabled;
    }

    private enableDoc(docId: string | null) {
        if (!docId) return;
        this.config.docEnableStatus[docId] = true;
        this.saveConfig();
    }

    private disableDoc(docId: string | null) {
        if (!docId) return;
        this.shouldUpdate = false;
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }
        this.config.docEnableStatus[docId] = false;
        this.saveConfig();
    }

    private getDocId(protyle: any): string | null {
        return protyle?.background.ial.id || null;
    }

    private getHeaderElements(protyle: any): NodeListOf<Element> {
        const wysiwyg = protyle.wysiwyg.element;
        return wysiwyg.querySelectorAll('[data-type="NodeHeading"]');
    }

    private async updateDocNumbering(protyle: any) {
        const docId = this.getDocId(protyle);
        if (!docId) return;

        this.removeTimer();

        try {
            // 获取所有标题元素
            const headerElements = this.getHeaderElements(protyle);
            if (!headerElements.length) return;

            // 收集所有存在的标题级别并排序
            const existingLevels = Array.from(
                new Set(
                    Array.from(headerElements)
                        .map((element: Element) => getHeaderLevel(element))
                        .filter((level: number) => level > 0)
                )
            ).sort((a: number, b: number) => a - b);

            // 准备更新
            const updates: Record<string, string> = {};
            const counters = [0, 0, 0, 0, 0, 0];

            // 处理每个标题
            for (const element of headerElements) {
                const blockId = element.getAttribute("data-node-id");
                if (!blockId) continue;

                const level = getHeaderLevel(element);
                if (level === 0) continue;

                const eleWithContent = element.querySelector(
                    '[contenteditable="true"]'
                );
                if (!eleWithContent) continue;
                
                // 获取原始HTML内容而不是纯文本
                const htmlContent = eleWithContent.innerHTML || "";
                
                // 检查是否已有序号并移除
                const actualLevel = existingLevels.indexOf(level);
                const format = this.config.formats[actualLevel];
                const originalContent = hasHeaderNumber(htmlContent, format)
                    ? removeHeaderNumber(htmlContent, format)
                    : htmlContent;

                // 生成新序号
                const [number, newCounters] = generateHeaderNumber(
                    level,
                    counters,
                    this.config.formats,
                    this.config.useChineseNumbers,
                    existingLevels
                );

                // 更新计数器
                Object.assign(counters, newCounters);
                
                // 添加新序号到HTML内容
                eleWithContent.innerHTML = number + originalContent;

                // 添加新序号
                updates[blockId] = element.outerHTML;
            }

            this.changeDocEnableStatus(true);

            // 批量更新内容
            if (Object.keys(updates).length > 0) {
                // 由于是从 DOM 中获取的内容，使用 dom 格式更新
                await batchUpdateBlockContent(updates, "dom");

                // 如果有活动的块，将光标移动到其末尾
                if (this.activeBlockId) {
                    setTimeout(() => {
                        const activeBlock = document.querySelector(
                            `[data-node-id="${this.activeBlockId}"]`
                        );
                        if (activeBlock) {
                            setCursorToEnd(activeBlock);
                        }
                    }, 200);
                }
            }

            this.shouldUpdate = false;
        } catch (error) {
            console.error(this.i18n.updateError, error);
            showMessage(this.i18n.updateErrorMsg);
        }
    }

    private async clearDocNumbering(protyle: any) {
        const docId = this.getDocId(protyle);
        if (!docId) return;

        try {
            // 获取所有标题元素
            const headerElements = this.getHeaderElements(protyle);
            if (!headerElements.length) return;

            // 收集所有存在的标题级别并排序
            const existingLevels = Array.from(
                new Set(
                    Array.from(headerElements)
                        .map((element: Element) => getHeaderLevel(element))
                        .filter((level: number) => level > 0)
                )
            ).sort((a: number, b: number) => a - b);

            // 准备更新
            const updates: Record<string, string> = {};

            // 处理每个标题
            for (const element of headerElements) {
                const blockId = element.getAttribute("data-node-id");
                if (!blockId) continue;

                const level = getHeaderLevel(element);
                if (level === 0) continue;

                const eleWithContent = element.querySelector(
                    '[contenteditable="true"]'
                );
                if (!eleWithContent) continue;
                
                // 获取原始HTML内容而不是纯文本
                const htmlContent = eleWithContent.innerHTML || "";

                // 获取对应级别的格式
                const actualLevel = existingLevels.indexOf(level);
                const format = this.config.formats[actualLevel];

                // 如果有序号，则移除
                if (hasHeaderNumber(htmlContent, format)) {
                    const originalContent = removeHeaderNumber(htmlContent, format);
                    eleWithContent.innerHTML = originalContent;
                    updates[blockId] = element.outerHTML;
                }
            }

            this.changeDocEnableStatus(false);

            // 批量更新内容
            if (Object.keys(updates).length > 0) {
                await batchUpdateBlockContent(updates, "dom");
            }
        } catch (error) {
            console.error(this.i18n.clearError, error);
            showMessage(this.i18n.clearErrorMsg);
        }
    }

    private removeTimer() {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }
    }
}
