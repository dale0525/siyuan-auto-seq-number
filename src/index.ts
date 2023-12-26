import {
    Plugin,
    Setting,
    confirm,
} from "siyuan";
import "./index.scss";

const STORAGE_NAME = "seq-number";
const DEFAULT_CONFIG = {
    seqNum: ["{1}. ", "{1}.{2} ", "{1}.{2}.{3} ", "{1}.{2}.{3}.{4} ", "{1}.{2}.{3}.{4}.{5} ", "{1}.{2}.{3}.{4}.{5}.{6} "],
    num2Chi: [false, false, false, false, false, false],
};
const NUM_2_CHI = {
    "1": "一",
    "2": "二",
    "3": "三",
    "4": "四",
    "5": "五",
    "6": "六",
};

export default class AutoSeqNumPlugin extends Plugin {

    private seq_num: Object = {};

    onLoadedProtyleStaticBindThis = this.onLoadedProtyleStatic.bind(this);
    onSwitchProtyleBindThis = this.onSwitchProtyle.bind(this);

    async onload() {
        this.eventBus.on("loaded-protyle-static", this.onLoadedProtyleStaticBindThis);
        this.eventBus.on("switch-protyle", this.onSwitchProtyleBindThis);

        await this.loadData(STORAGE_NAME);
        if (typeof this.data[STORAGE_NAME] !== "object" || this.data[STORAGE_NAME].hasOwnProperty("seqNum") === false || this.data[STORAGE_NAME].hasOwnProperty("num2Chi") === false) {
            await this.saveData(STORAGE_NAME, DEFAULT_CONFIG);
        }
        
        // 增加设置项
        const inputElements = [
            document.createElement("input"),
            document.createElement("input"),
            document.createElement("input"),
            document.createElement("input"),
            document.createElement("input"),
            document.createElement("input"),
        ];
        const checkboxes = [
            document.createElement("input"),
            document.createElement("input"),
            document.createElement("input"),
            document.createElement("input"),
            document.createElement("input"),
            document.createElement("input"),
        ];
        this.setting = new Setting({
            confirmCallback: async () => {
                await this.saveData(STORAGE_NAME, {
                    seqNum: [inputElements[0].value, inputElements[1].value, inputElements[2].value, inputElements[3].value, inputElements[4].value, inputElements[5].value],
                    num2Chi: [checkboxes[0].checked, checkboxes[1].checked, checkboxes[2].checked, checkboxes[3].checked, checkboxes[4].checked, checkboxes[5].checked],
                });
                globalThis.location.reload();
            }
        });
        for (let i = 0; i < 6; i++) {
            inputElements[i].placeholder = this.data[STORAGE_NAME].seqNum[i];
            inputElements[i].value = this.data[STORAGE_NAME].seqNum[i];
            checkboxes[i].checked = this.data[STORAGE_NAME].num2Chi[i];
            this.setting.addItem(this.addSettingsItem(
                this.i18n[`seqNumSettingLevel${i + 1}`],
                i == 0 ? this.i18n.seqNumLevel1Note : null,
                inputElements[i],
                checkboxes[i],
            ));
        }
        // 重置设置按钮
        this.setting.addItem({
            title: this.i18n.resetConfig,
            description: this.i18n.resetConfigDesc,
            createActionElement: () => {
                const btn = document.createElement("button");
                btn.className = "b3-button b3-button--outline fn__flex-center fn__size200";
                btn.textContent = this.i18n.resetConfig;
                btn.addEventListener("click", () => {
                    this.resetOptions();
                });
                return btn;
            },
        });
    }

    onunload() {
        this.eventBus.off("loaded-protyle-static", this.onLoadedProtyleStaticBindThis);
        this.eventBus.off("switch-protyle", this.onSwitchProtyleBindThis);
    }

    async onSwitchProtyle({detail}: any){
        sessionStorage.removeItem(STORAGE_NAME);
    }

    async onLoadedProtyleStatic({detail}: any){
        let pageHtml = detail.protyle.element;
        this.addSeqNum(pageHtml);
    }

    async resetOptions(){
        confirm(
            this.i18n.resetConfig,
            this.i18n.resetConfigDesc,
            async () => {
                await this.saveData(STORAGE_NAME, DEFAULT_CONFIG);
                globalThis.location.reload();
            }
        );
    }

    // 每一级标题的单独设置项，包括序号格式和是否转中文
    addSettingsItem(title: string, description: string, inputElement: any, checkbox: any) {
        return {
            title: title,
            description: description,
            createActionElement: () => {
                const div = document.createElement("div");
                div.className = "b3-label";

                inputElement.className = "b3-text-field";
                div.appendChild(this.createConfigElement(this.i18n.seqNumSettingFormat, inputElement));

                div.appendChild(this.addConfigElementSeparator());

                checkbox.className = "b3-switch";
                checkbox.type = "checkbox";
                div.appendChild(this.createConfigElement(this.i18n.seqNumSettingNum2Chi, checkbox));

                return div;
            },
        };
    }

    // 每一个单独设置项目，包括标题、描述、留空、设置项
    createConfigElement(text: string, element: any) {
        const label = document.createElement("label");
        label.className = "fn__flex config__item";
        const div = document.createElement("div");
        div.className = "fn__flex-center fn__flex-1 ft__on-surface";
        const space = document.createElement("span");
        space.className = "fn__space";
        div.innerText = text;
        label.appendChild(div);
        label.appendChild(space);
        label.appendChild(element);
        return label;
    }

    // 设置标题和设置项中间的留空
    addConfigElementSeparator() {
        const span = document.createElement("span");
        span.className = "fn__space";
        return span;
    }

    addSeqNum(html: any) {
        // 初始化计数器
        let counters = [0, 0, 0, 0, 0, 0];
        let trueCounters = [];

        // 获取所有标题元素
        let headers = html.querySelectorAll('.protyle-wysiwyg [data-node-id].h1, .protyle-wysiwyg [data-node-id].h2, .protyle-wysiwyg [data-node-id].h3, .protyle-wysiwyg [data-node-id].h4, .protyle-wysiwyg [data-node-id].h5, .protyle-wysiwyg [data-node-id].h6');
        
        let seq_num_storage = sessionStorage.getItem(STORAGE_NAME);
        if(seq_num_storage !== null) {
            this.seq_num = JSON.parse(seq_num_storage);
        }

        // 遍历所有标题元素
        for (let i = 0; i < headers.length; i++) {
            const element_id = headers[i].getAttribute('data-node-id');
            if(element_id === null) {
                continue;
            }
            if (this.seq_num[element_id] !== undefined) {
                headers[i].setAttribute(STORAGE_NAME, this.seq_num[element_id]);
                continue;
            }

            // 获取当前标题的级别
            let level = parseInt(headers[i].className.charAt(1));

            // 重置所有更高级别的计数器
            for (let j = level + 1; j < counters.length; j++) {
                counters[j] = 0;
            }

            // 增加当前级别的计数器
            counters[level]++;

            // 获取有效标题级别数量
            let trueLevel = 0;
            for (let j = 0; j <= level; j++) {
                if (counters[j] > 0)
                {
                    trueCounters.push(counters[j]);
                    trueLevel++;
                }
            }

            // 生成编号
            let settingsNum = this.data[STORAGE_NAME].seqNum[trueLevel - 1];
            let num2Chi = this.data[STORAGE_NAME].num2Chi[trueLevel - 1];
            for (let j = 0; j < trueLevel; j++) {
                settingsNum = settingsNum.replace(`{${j + 1}}`, num2Chi ? NUM_2_CHI[trueCounters[j].toString()] : trueCounters[j]).replace(" ", "\u00a0");
            }

            // 设置dom元素的编号属性，通过css伪类来显示编号
            headers[i].setAttribute(STORAGE_NAME, settingsNum);
            this.seq_num[element_id] = settingsNum;

            trueCounters = [];
        }
        sessionStorage.setItem(STORAGE_NAME, JSON.stringify(this.seq_num));
    }
}
