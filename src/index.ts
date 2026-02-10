import { Plugin, Setting, showMessage } from "siyuan";
import { setCursorToEnd } from "./utils/dom_operate";
import { IPluginConfig } from "./types";
import {
    addAutoNumberMarker,
    extractAutoNumberMarkerInfo,
    extractLegacyAutoNumberPrefix,
    generateHeaderNumber,
    stripAutoNumberMarker,
} from "./utils/header_utils";
import {
    batchUpdateBlockContent,
    getDocHeadingBlocks,
    getVersion,
    IDocHeadingBlock,
} from "./utils/api";
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

const TOP_BAR_ICON_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>';

export default class HeaderNumberPlugin extends Plugin {
    public config!: IPluginConfig;
    private updateTimer: number | null = null;
    private lastInputTime = 0;
    private activeDocId: string | null = null;
    private activeProtyle: any;
    private shouldUpdate = false;
    private activeBlockId: string | null = null;
    private topBarElement: HTMLElement | null = null;
    private topBarSyncTimers: number[] = [];
    private version = "";

    async onload() {
        this.version = await getVersion();
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
                container.className = "setting-item__action";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "b3-switch fn__flex-center";
                checkbox.checked = this.config.defaultEnabled;
                checkbox.addEventListener("change", () => {
                    this.config.defaultEnabled = checkbox.checked;
                });

                container.appendChild(checkbox);
                return container;
            },
        });

        // 添加实时更新设置
        this.setting.addItem({
            title: this.i18n.realTimeUpdate,
            description: this.i18n.realTimeUpdateDesc,
            createActionElement: () => {
                const container = document.createElement("div");
                container.className = "setting-item__action";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "b3-switch fn__flex-center";
                checkbox.checked = this.config.realTimeUpdate;
                checkbox.addEventListener("change", () => {
                    this.config.realTimeUpdate = checkbox.checked;
                    if (checkbox.checked) {
                        this.eventBus.on("ws-main", this.onEdited);
                    } else {
                        this.eventBus.off("ws-main", this.onEdited);
                        if (this.updateTimer) {
                            clearTimeout(this.updateTimer);
                        }
                    }
                });

                container.appendChild(checkbox);
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
                    container.className = "setting-item__action";

                    // 创建格式输入框
                    const inputContainer = document.createElement("div");
                    inputContainer.className = "fn__flex-1";

                    const input = document.createElement("input");
                    input.type = "text";
                    input.className = "b3-text-field fn__flex-1";
                    input.value = this.config.formats[i];
                    input.placeholder = "例如: 第{1}章";
                    input.addEventListener("change", () => {
                        this.config.formats[i] = input.value;
                    });

                    inputContainer.appendChild(input);
                    container.appendChild(inputContainer);

                    // 创建中文数字选项
                    const checkboxContainer = document.createElement("div");
                    checkboxContainer.className =
                        "fn__flex fn__flex-center chinese-number-option";
                    checkboxContainer.style.marginTop = "5px"; // 写在scss里面不生效？

                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.className = "b3-switch fn__flex-center";
                    checkbox.checked = this.config.useChineseNumbers[i];
                    checkbox.addEventListener("change", () => {
                        this.config.useChineseNumbers[i] = checkbox.checked;
                    });

                    const label = document.createElement("span");
                    label.className = "chinese-number-label";
                    label.style.marginLeft = "8px"; // 写在scss里面不生效？
                    label.textContent = this.i18n.useChineseNumbers;

                    checkboxContainer.appendChild(checkbox);
                    checkboxContainer.appendChild(label);
                    container.appendChild(checkboxContainer);

                    return container;
                },
            });
        }

        // 添加重置按钮
        this.setting.addItem({
            title: this.i18n.resetConfig,
            description: this.i18n.resetConfigDesc,
            createActionElement: () => {
                const container = document.createElement("div");
                container.className = "setting-item__action";

                const button = document.createElement("button");
                button.className = "b3-button b3-button--outline";
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

                container.appendChild(button);
                return container;
            },
        });

        // 监听编辑器加载事件
        this.eventBus.on("loaded-protyle-dynamic", this.onProtyleLoaded);
        this.eventBus.on("loaded-protyle-static", this.onProtyleLoaded);
        this.eventBus.on("switch-protyle", this.onDocSwitch);
        this.eventBus.on("destroy-protyle", this.onDocClosed);
        if (this.config.realTimeUpdate) {
            this.eventBus.on("ws-main", this.onEdited);
        }
    }

    onLayoutReady() {
        this.initTopBar();
    }

    async onunload() {
        // 清理定时器
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }
        this.clearTopBarSyncTimers();
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

    private changeDocEnableStatus(enabled: boolean | null) {
        if (!this.activeDocId || enabled === null) {
            this.updateTopBarActiveState();
            return;
        }

        if (enabled) {
            this.enableDoc(this.activeDocId);
        } else {
            this.disableDoc(this.activeDocId);
        }

        this.updateTopBarActiveState();
    }

    private initTopBar() {
        if (this.topBarElement) {
            this.syncTopBarElement();
            this.updateTopBarActiveState();
            this.scheduleTopBarSync();
            return;
        }

        // 添加标题序号切换按钮
        this.topBarElement = this.addTopBar({
            icon: TOP_BAR_ICON_SVG,
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
                this.changeDocEnableStatus(this.isDocEnabled(this.activeDocId));
            },
        });

        // 添加自定义类名
        if (this.topBarElement) {
            this.topBarElement.classList.add("toolbar__item--auto-seq-number");
        }

        this.syncTopBarElement();
        this.updateTopBarActiveState();
        this.scheduleTopBarSync();
    }

    private updateTopBarActiveState() {
        if (!this.topBarElement) {
            return;
        }

        if (this.activeDocId && this.isDocEnabled(this.activeDocId)) {
            this.topBarElement.classList.add("active");
            return;
        }

        this.topBarElement.classList.remove("active");
    }

    private syncTopBarElement() {
        if (!this.topBarElement) {
            return;
        }

        const toolbarElement = document.querySelector("#toolbar");
        if (!toolbarElement) {
            return;
        }

        if (!document.contains(this.topBarElement)) {
            const barPluginsElement = toolbarElement.querySelector("#barPlugins");
            barPluginsElement?.before(this.topBarElement);
        }

        window.dispatchEvent(new Event("resize"));
    }

    private scheduleTopBarSync() {
        this.clearTopBarSyncTimers();

        [0, 300, 1000].forEach((delay) => {
            const timerId = window.setTimeout(() => {
                this.syncTopBarElement();
                this.updateTopBarActiveState();
            }, delay);
            this.topBarSyncTimers.push(timerId);
        });
    }

    private clearTopBarSyncTimers() {
        this.topBarSyncTimers.forEach((timerId) => {
            clearTimeout(timerId);
        });
        this.topBarSyncTimers = [];
    }

    private onProtyleLoaded = async (e: CustomEvent) => {
        this.initTopBar();
        this.activeProtyle = e.detail.protyle;
        this.activeDocId = this.getDocId(this.activeProtyle);
        if (!this.activeDocId) return;

        // 更新状态栏显示
        this.changeDocEnableStatus(this.isDocEnabled(this.activeDocId));

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

    private onDocClosed = () => {
        this.activeDocId = null;
        this.activeProtyle = null;
        this.changeDocEnableStatus(null);
    };

    private onDocSwitch = (e: CustomEvent) => {
        this.initTopBar();
        this.activeProtyle = e.detail.protyle;
        this.activeDocId = this.getDocId(this.activeProtyle);
        this.activeBlockId = null;

        // 更新状态栏显示
        this.changeDocEnableStatus(this.isDocEnabled(this.activeDocId));
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

    private getHeadingLevelFromSubtype(subtype: string): number {
        const matched = subtype.match(/^h([1-6])$/);
        if (!matched) {
            return 0;
        }

        return Number(matched[1]);
    }

    private getExistingLevelsByHeadings(headings: IDocHeadingBlock[]): number[] {
        return Array.from(
            new Set(
                headings
                    .map((heading) => this.getHeadingLevelFromSubtype(heading.subtype))
                    .filter((level) => level > 0)
            )
        ).sort((a, b) => a - b);
    }

    private async updateDocNumbering(protyle: any) {
        const docId = this.getDocId(protyle);
        if (!docId) return;

        this.removeTimer();

        try {
            const headings = await getDocHeadingBlocks(docId);
            if (!headings.length) {
                this.shouldUpdate = false;
                return;
            }

            const existingLevels = this.getExistingLevelsByHeadings(headings);
            const counters = [0, 0, 0, 0, 0, 0];
            const updates: Record<string, string> = {};

            for (const heading of headings) {
                const level = this.getHeadingLevelFromSubtype(heading.subtype);
                if (level === 0) {
                    continue;
                }

                const [number, newCounters] = generateHeaderNumber(
                    level,
                    counters,
                    this.config.formats,
                    this.config.useChineseNumbers,
                    existingLevels
                );
                Object.assign(counters, newCounters);

                const markerInfo = extractAutoNumberMarkerInfo(heading.markdown);
                const restoredContent = markerInfo
                    ? markerInfo.backupPrefix + markerInfo.content
                    : heading.markdown;

                let backupPrefix = markerInfo?.backupPrefix || "";
                if (!backupPrefix) {
                    backupPrefix = extractLegacyAutoNumberPrefix(
                        restoredContent,
                        number
                    );
                }
                const contentWithoutPrefix = backupPrefix
                    ? restoredContent.substring(backupPrefix.length)
                    : restoredContent;

                updates[heading.id] =
                    addAutoNumberMarker(number, backupPrefix) + contentWithoutPrefix;
            }

            this.changeDocEnableStatus(true);

            if (Object.keys(updates).length > 0) {
                await batchUpdateBlockContent(
                    updates,
                    "markdown",
                    this.canUseBulkApi()
                );
                this.resetActiveBlockCursor();
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
            const headings = await getDocHeadingBlocks(docId);
            if (!headings.length) {
                return;
            }

            const updates: Record<string, string> = {};
            for (const heading of headings) {
                const restored = stripAutoNumberMarker(heading.markdown, true);
                if (restored !== heading.markdown) {
                    updates[heading.id] = restored;
                }
            }

            this.changeDocEnableStatus(false);

            if (Object.keys(updates).length > 0) {
                await batchUpdateBlockContent(
                    updates,
                    "markdown",
                    this.canUseBulkApi()
                );
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

    private resetActiveBlockCursor() {
        if (!this.activeBlockId) {
            return;
        }

        setTimeout(() => {
            const activeBlock = document.querySelector(
                `[data-node-id="${this.activeBlockId}"]`
            );
            if (activeBlock) {
                setCursorToEnd(activeBlock);
            }
        }, 200);
    }

    private canUseBulkApi() {
        // 如果版本号小于3.1.25，则不能使用批量更新
        return this.version >= "3.1.25";
    }
}
