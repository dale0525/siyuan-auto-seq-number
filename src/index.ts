import { Menu, Plugin, Setting, showMessage } from "siyuan";
import { setCursorToEnd } from "./utils/dom_operate";
import { IPluginConfig } from "./types";
import { createSiyuanApi } from "./infra/siyuan_api";
import {
    buildDomClearAllUpdates,
    buildDomClearUpdates,
    buildDomNumberingUpdates,
    IDomHeadingRecord,
} from "./plugin/dom_heading_fallback";
import { updateDomBlocksDirectly } from "./plugin/dom_block_updater";
import { resolveDynamicLoadingPolicy } from "./plugin/dynamic_loading_policy";
import { reloadActiveProtyleView } from "./plugin/protyle_reload";
import { syncLoadedHeadingMarkdownUpdates } from "./plugin/markdown_dom_sync";
import { shouldSyncLoadedViewAfterUpdate, UpdateTrigger } from "./plugin/update_view_sync";
import { resolveDocEnabled } from "./plugin/doc_enable";
import { resolveDocId } from "./plugin/doc_id";
import { routeToggleNumbering } from "./plugin/index_controller";
import { shouldQueueRealtimeUpdateFromInput } from "./plugin/realtime_input";
import { resolveRealtimeUpdateDecision } from "./plugin/realtime_trigger";
import { createNumberingService, NumberingService } from "./services/numbering_service";
import { getHeaderLevel } from "./utils/header_utils";
import "./style.scss";

// 存储配置的键�?
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
    private updateTimer: number | null = null;
    private lastInputTime = 0;
    private activeDocId: string | null = null;
    private activeProtyle: any;
    private shouldUpdate = false;
    private activeBlockId: string | null = null;
    private topBarElement: HTMLElement | null = null;
    private numberingService: NumberingService | null = null;
    private realtimeListenerBound = false;
    private realtimeInputHandler: ((event: Event) => void) | null = null;
    private topBarContextMenuHandler: ((event: MouseEvent) => void) | null = null;

    async onload() {
        // 加载配置
        this.config = await this.loadConfig();
        this.refreshNumberingService();

        // 初始化设置面�?
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
                    this.setRealTimeUpdateEnabled(checkbox.checked);
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

                    // 创建格式输入�?
                    const inputContainer = document.createElement("div");
                    inputContainer.className = "fn__flex-1";

                    const input = document.createElement("input");
                    input.type = "text";
                    input.className = "b3-text-field fn__flex-1";
                    input.value = this.config.formats[i];
                    input.placeholder = "����: ��{1}��";
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
                    this.setRealTimeUpdateEnabled(this.config.realTimeUpdate);
                    this.refreshNumberingService();
                    await this.saveConfig();
                    showMessage(this.i18n.settingsResetSuccess);
                    globalThis.location.reload();
                });

                container.appendChild(button);
                return container;
            },
        });

        this.setting.addItem({
            title: this.i18n.clearAllHeadingNumbers,
            description: this.i18n.clearAllHeadingNumbersDesc,
            createActionElement: () => {
                const container = document.createElement("div");
                container.className = "setting-item__action";

                const button = document.createElement("button");
                button.className = "b3-button b3-button--outline";
                button.textContent = this.i18n.clearAllHeadingNumbers;
                button.addEventListener("click", () => {
                    void this.clearAllHeadingNumbersForCurrentDoc();
                });

                container.appendChild(button);
                return container;
            },
        });

        // 初始化顶部工具栏
        this.initTopBar();
        this.addCommand({
            langKey: "clearAllHeadingNumbers",
            langText: this.i18n.clearAllHeadingNumbers,
            hotkey: "",
            callback: () => {
                void this.clearAllHeadingNumbersForCurrentDoc();
            },
        });

        // 监听编辑器加载事�?
        this.eventBus.on("loaded-protyle-dynamic", this.onProtyleLoaded);
        this.eventBus.on("loaded-protyle-static", this.onProtyleLoaded);
        this.eventBus.on("switch-protyle", this.onDocSwitch);
        this.eventBus.on("destroy-protyle", this.onDocClosed);
        this.setRealTimeUpdateEnabled(this.config.realTimeUpdate);
    }

    async onunload() {
        // 清理定时�?
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }
        // 移除事件监听
        this.eventBus.off("loaded-protyle-dynamic", this.onProtyleLoaded);
        this.eventBus.off("loaded-protyle-static", this.onProtyleLoaded);
        this.setRealTimeUpdateEnabled(false);
        this.unbindRealtimeInputListener();
        this.unbindTopBarContextMenu();
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

    private refreshNumberingService() {
        this.numberingService = createNumberingService(createSiyuanApi(), {
            formats: this.config.formats,
            useChineseNumbers: this.config.useChineseNumbers,
        });
    }

    private setRealTimeUpdateEnabled(enabled: boolean) {
        this.config.realTimeUpdate = enabled;

        if (enabled && !this.realtimeListenerBound) {
            this.eventBus.on("ws-main", this.onEdited);
            this.realtimeListenerBound = true;
        }

        if (!enabled && this.realtimeListenerBound) {
            this.eventBus.off("ws-main", this.onEdited);
            this.realtimeListenerBound = false;
            this.shouldUpdate = false;
            this.removeTimer();
        }

        if (enabled) {
            this.bindRealtimeInputListener();
        } else {
            this.unbindRealtimeInputListener();
        }
    }

    private unbindRealtimeInputListener() {
        if (typeof document !== "undefined" && this.realtimeInputHandler) {
            document.removeEventListener("input", this.realtimeInputHandler, true);
        }
        this.realtimeInputHandler = null;
    }

    private bindRealtimeInputListener() {
        if (!this.config.realTimeUpdate) {
            return;
        }

        if (typeof document === "undefined") {
            return;
        }

        if (this.realtimeInputHandler) {
            return;
        }

        const handler = (event: Event) => {
            if (!this.config.realTimeUpdate) {
                return;
            }

            const target = event.target as HTMLElement | null;
            const isHeadingNode = Boolean(
                target?.closest?.(
                    '[data-type="NodeHeading"],[data-subtype="h1"],[data-subtype="h2"],[data-subtype="h3"],[data-subtype="h4"],[data-subtype="h5"],[data-subtype="h6"]'
                )
            );
            const textContent = target?.textContent || "";
            if (
                shouldQueueRealtimeUpdateFromInput({
                    isHeadingNode,
                    textContent,
                })
            ) {
                this.shouldUpdate = true;
                this.queueUpdate();
            }
        };

        document.addEventListener("input", handler, true);
        this.realtimeInputHandler = handler;
    }

    private changeDocEnableStatus(enabled: boolean | null) {
        if (!this.activeDocId) {
            this.topBarElement?.classList.remove("active");
            return;
        }
        if (enabled === null) {
            this.topBarElement?.classList.remove("active");
            return;
        }
        if (enabled) {
            this.enableDoc(this.activeDocId);
            this.topBarElement?.classList.add("active");
        } else {
            this.disableDoc(this.activeDocId);
            this.topBarElement?.classList.remove("active");
        }
    }

    private initTopBar() {
        // 添加标题序号切换按钮
        this.topBarElement = this.addTopBar({
            icon: "iconList",
            title: this.i18n.toggleHeaderNumber,
            callback: async () => {
                try {
                    const result = await routeToggleNumbering({
                        activeDocId: this.activeDocId,
                        isEnabled: this.isDocEnabled(this.activeDocId),
                        preservePrefixOnClear: true,
                        service: {
                            updateDocument: (docId: string) => {
                                return this.updateDocNumberingById(
                                    docId,
                                    "manual-toggle"
                                );
                            },
                            clearDocument: (
                                docId: string,
                                options: { preservePrefix: boolean }
                            ) => {
                                return this.clearDocNumberingById(
                                    docId,
                                    options.preservePrefix
                                );
                            },
                        },
                    });

                    if (result === "updated") {
                        showMessage(this.i18n.numberingEnabled);
                        this.enableDoc(this.activeDocId);
                        this.topBarElement?.classList.add("active");
                    } else if (result === "cleared") {
                        showMessage(this.i18n.numberingDisabled);
                        this.disableDoc(this.activeDocId);
                        this.topBarElement?.classList.remove("active");
                    }

                    this.changeDocEnableStatus(this.isDocEnabled(this.activeDocId));
                } catch (error) {
                    console.error(this.i18n.updateError, error);
                    showMessage(this.i18n.updateErrorMsg);
                }
            },
        });

        // 添加自定义类�?
        if (this.topBarElement) {
            this.topBarElement.classList.add("toolbar__item--auto-seq-number");
            // 根据当前文档状态设置激活状�?
            if (this.activeDocId && this.isDocEnabled(this.activeDocId)) {
                this.topBarElement?.classList.add("active");
            }
        }
        this.bindTopBarContextMenu();
    }

    private bindTopBarContextMenu() {
        if (!this.topBarElement || this.topBarContextMenuHandler) {
            return;
        }

        const handler = (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            const menu = new Menu("auto-seq-number-topbar-menu");
            menu.addItem({
                icon: "iconTrashcan",
                label: this.i18n.clearAllHeadingNumbers,
                click: async () => {
                    await this.clearAllHeadingNumbersForCurrentDoc();
                },
            });
            menu.open({
                x: event.clientX,
                y: event.clientY,
            });
        };

        this.topBarElement.addEventListener("contextmenu", handler);
        this.topBarContextMenuHandler = handler;
    }

    private unbindTopBarContextMenu() {
        if (!this.topBarElement || !this.topBarContextMenuHandler) {
            return;
        }

        this.topBarElement.removeEventListener(
            "contextmenu",
            this.topBarContextMenuHandler
        );
        this.topBarContextMenuHandler = null;
    }

    private onProtyleLoaded = async (e: CustomEvent) => {
        this.activeProtyle = e.detail.protyle;
        this.activeDocId = this.getDocId(this.activeProtyle);
        this.bindRealtimeInputListener();

        // 更新状态栏显示
        if (this.activeDocId) {
            this.changeDocEnableStatus(this.isDocEnabled(this.activeDocId));
        }

        // 更新顶部工具栏状�?
        if (this.topBarElement) {
            if (this.isDocEnabled(this.activeDocId)) {
                this.topBarElement.classList.add("active");
            } else {
                this.topBarElement.classList.remove("active");
            }
        }

        // 检查文档是否启用了序号
        if (this.isDocEnabled(this.activeDocId)) {
            await this.updateDocNumbering(this.activeProtyle);
        }
    };

    private onEdited = async (e: CustomEvent) => {
        this.lastInputTime = Date.now();
        if (!this.isDocEnabled(this.activeDocId)) return;
        if (!e.detail)
            return;
        if (!Array.isArray(e.detail.data)) {
            return;
        }
        const cmd = String(e.detail.cmd || "").toLowerCase();
        if (cmd && !cmd.includes("transaction")) {
            return;
        }
        for (const transaction of e.detail.data) {
            for (const operation of transaction.doOperations) {
                if (operation.action === "insert") {
                    this.activeBlockId = operation.id;
                }

                const decision = resolveRealtimeUpdateDecision(
                    operation,
                    this.shouldUpdate
                );
                this.shouldUpdate = decision.nextShouldUpdate;

                if (decision.shouldQueue) {
                    this.queueUpdate();
                }
            }
        }
    };

    private onDocClosed = () => {
        this.changeDocEnableStatus(null);
        this.unbindRealtimeInputListener();
    };

    private onDocSwitch = (e: CustomEvent) => {
        this.activeProtyle = e.detail.protyle;
        this.activeDocId = this.getDocId(this.activeProtyle);
        this.activeBlockId = null;
        this.bindRealtimeInputListener();

        // 更新状态栏显示
        this.changeDocEnableStatus(this.isDocEnabled(this.activeDocId));
    };

    private queueUpdate() {
        this.removeTimer();

        // �����µĶ�ʱ��
        this.updateTimer = window.setTimeout(async () => {
            // ����Ƿ�������һ�������Ѿ���ȥ2��
            if (Date.now() - this.lastInputTime >= 2000) {
                if (this.shouldUpdate) {
                    try {
                        const policy = resolveDynamicLoadingPolicy(
                            this.activeDocId
                        );

                        if (policy.useDocumentSourceWhenAvailable && this.activeDocId) {
                            await this.updateDocNumberingById(
                                this.activeDocId,
                                "realtime"
                            );
                        } else if (
                            policy.allowLoadedDomFallbackForUpdate &&
                            this.activeProtyle
                        ) {
                            const domUpdates = await this.applyDomNumberingFallback(
                                this.activeProtyle
                            );
                            if (Object.keys(domUpdates).length > 0) {
                                this.restoreActiveBlockCursor();
                                this.shouldUpdate = false;
                                return;
                            }
                        } else if (this.activeProtyle) {
                            this.shouldUpdate = false;
                        }
                    } catch (error) {
                        console.error(this.i18n.updateError, error);
                    }
                }
            } else {
                // �����û��2�룬�������ö�ʱ��
                this.queueUpdate();
            }
        }, 2000) as unknown as number;
    }

    private isDocEnabled(docId: string | null): boolean {
        return resolveDocEnabled(
            docId,
            this.config.docEnableStatus,
            this.config.defaultEnabled
        );
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
        return resolveDocId(protyle);
    }

    private getActiveProtyleForDoc(docId: string): any | null {
        if (!this.activeProtyle) {
            return null;
        }

        return this.getDocId(this.activeProtyle) === docId ? this.activeProtyle : null;
    }

    private collectDomHeadingRecords(protyle: any): {
        records: IDomHeadingRecord[];
        elementById: Map<string, Element>;
    } {
        const root = protyle?.wysiwyg?.element as Element | undefined;
        if (!root) {
            return { records: [], elementById: new Map() };
        }

        const headingElements = root.querySelectorAll(
            '[data-type="NodeHeading"],[data-subtype="h1"],[data-subtype="h2"],[data-subtype="h3"],[data-subtype="h4"],[data-subtype="h5"],[data-subtype="h6"]'
        );
        const records: IDomHeadingRecord[] = [];
        const elementById = new Map<string, Element>();

        for (const element of headingElements) {
            const blockId = element.getAttribute("data-node-id");
            if (!blockId) {
                continue;
            }

            const level = getHeaderLevel(element);
            if (level === 0) {
                continue;
            }

            const contentElement = element.querySelector('[contenteditable="true"]');
            const htmlContent = contentElement?.innerHTML || "";
            records.push({
                id: blockId,
                level,
                htmlContent,
            });
            elementById.set(blockId, element);
        }

        return { records, elementById };
    }

    private async applyDomNumberingFallback(protyle: any): Promise<Record<string, string>> {
        const { records, elementById } = this.collectDomHeadingRecords(protyle);
        const contentUpdates = buildDomNumberingUpdates(records, this.config);
        if (Object.keys(contentUpdates).length === 0) {
            return {};
        }

        const domUpdates: Record<string, string> = {};
        for (const [id, content] of Object.entries(contentUpdates)) {
            const element = elementById.get(id);
            if (!element) {
                continue;
            }
            const contentElement = element.querySelector('[contenteditable="true"]');
            if (!contentElement) {
                continue;
            }

            contentElement.innerHTML = content;
            domUpdates[id] = element.outerHTML;
        }

        if (Object.keys(domUpdates).length > 0) {
            await updateDomBlocksDirectly(domUpdates);
        }
        return domUpdates;
    }

    private async applyDomClearFallback(protyle: any): Promise<Record<string, string>> {
        const { records, elementById } = this.collectDomHeadingRecords(protyle);
        const contentUpdates = buildDomClearUpdates(records, this.config);
        if (Object.keys(contentUpdates).length === 0) {
            return {};
        }

        const domUpdates: Record<string, string> = {};
        for (const [id, content] of Object.entries(contentUpdates)) {
            const element = elementById.get(id);
            if (!element) {
                continue;
            }
            const contentElement = element.querySelector('[contenteditable="true"]');
            if (!contentElement) {
                continue;
            }

            contentElement.innerHTML = content;
            domUpdates[id] = element.outerHTML;
        }

        if (Object.keys(domUpdates).length > 0) {
            await updateDomBlocksDirectly(domUpdates);
        }
        return domUpdates;
    }

    private async applyDomClearAllFallback(protyle: any): Promise<Record<string, string>> {
        const { records, elementById } = this.collectDomHeadingRecords(protyle);
        const contentUpdates = buildDomClearAllUpdates(records);
        if (Object.keys(contentUpdates).length === 0) {
            return {};
        }

        const domUpdates: Record<string, string> = {};
        for (const [id, content] of Object.entries(contentUpdates)) {
            const element = elementById.get(id);
            if (!element) {
                continue;
            }
            const contentElement = element.querySelector('[contenteditable="true"]');
            if (!contentElement) {
                continue;
            }

            contentElement.innerHTML = content;
            domUpdates[id] = element.outerHTML;
        }

        if (Object.keys(domUpdates).length > 0) {
            await updateDomBlocksDirectly(domUpdates);
        }
        return domUpdates;
    }

    private getNumberingService(): NumberingService {
        if (!this.numberingService) {
            this.refreshNumberingService();
        }
        return this.numberingService as NumberingService;
    }

    private async updateDocNumberingById(
        docId: string,
        trigger: UpdateTrigger = "load"
    ) {
        this.removeTimer();
        const updates = await this.getNumberingService().updateDocument(docId);

        const activeProtyle = this.getActiveProtyleForDoc(docId);
        if (
            activeProtyle &&
            Object.keys(updates).length > 0 &&
            shouldSyncLoadedViewAfterUpdate(trigger)
        ) {
            syncLoadedHeadingMarkdownUpdates(activeProtyle, updates);
        }

        if (Object.keys(updates).length > 0) {
            this.restoreActiveBlockCursor();
        }

        this.shouldUpdate = false;
    }

    private async clearDocNumberingById(
        docId: string,
        preservePrefix: boolean
    ) {
        await this.getNumberingService().clearDocument(docId, {
            preservePrefix,
        });

        const policy = resolveDynamicLoadingPolicy(docId);
        const activeProtyle = this.getActiveProtyleForDoc(docId);
        if (policy.allowLoadedDomFallbackForClear && activeProtyle) {
            await this.applyDomClearFallback(activeProtyle);
        }
        if (activeProtyle) {
            reloadActiveProtyleView(activeProtyle, false);
        }
    }

    private async clearAllDocNumberingById(docId: string) {
        await this.getNumberingService().clearAllNumbering(docId);

        const policy = resolveDynamicLoadingPolicy(docId);
        const activeProtyle = this.getActiveProtyleForDoc(docId);
        if (policy.allowLoadedDomFallbackForClearAll && activeProtyle) {
            await this.applyDomClearAllFallback(activeProtyle);
        }
        if (activeProtyle) {
            reloadActiveProtyleView(activeProtyle, false);
        }
    }

    private async updateDocNumbering(protyle: any) {
        const docId = this.getDocId(protyle);
        try {
            if (docId) {
                await this.updateDocNumberingById(docId, "load");
            } else {
                await this.applyDomNumberingFallback(protyle);
            }
        } catch (error) {
            console.error(this.i18n.updateError, error);
            showMessage(this.i18n.updateErrorMsg);
        }
    }

    private async clearDocNumbering(protyle: any) {
        const docId = this.getDocId(protyle);
        try {
            if (docId) {
                await this.clearDocNumberingById(docId, true);
            } else {
                await this.applyDomClearFallback(protyle);
            }
        } catch (error) {
            console.error(this.i18n.clearError, error);
            showMessage(this.i18n.clearErrorMsg);
        }
    }

    private async clearAllHeadingNumbersForCurrentDoc() {
        const docId = this.activeDocId || this.getDocId(this.activeProtyle);
        if (!docId) {
            showMessage(this.i18n.noActiveDocumentMsg);
            return;
        }

        try {
            await this.clearAllDocNumberingById(docId);
            this.disableDoc(docId);
            this.topBarElement?.classList.remove("active");
            showMessage(this.i18n.clearAllSuccessMsg);
        } catch (error) {
            console.error(this.i18n.clearAllError, error);
            showMessage(this.i18n.clearAllErrorMsg);
        }
    }

    private removeTimer() {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }
    }

    private restoreActiveBlockCursor() {
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
}





