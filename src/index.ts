import {
    Plugin,
} from "siyuan";
import "./index.scss";

export default class AutoSeqNumPlugin extends Plugin {

    private seq_num: Object = {};

    onLoadedProtyleStaticBindThis = this.onLoadedProtyleStatic.bind(this);
    onSwitchProtyleBindThis = this.onSwitchProtyle.bind(this);

    onload() {
        this.eventBus.on("loaded-protyle-static", this.onLoadedProtyleStaticBindThis);
        this.eventBus.on("switch-protyle", this.onSwitchProtyleBindThis);
    }

    onunload() {
        this.eventBus.off("loaded-protyle-static", this.onLoadedProtyleStaticBindThis);
        this.eventBus.off("switch-protyle", this.onSwitchProtyleBindThis);
    }

    async onSwitchProtyle({detail}: any){
        sessionStorage.removeItem('seq-num');
    }

    async onLoadedProtyleStatic({detail}: any){
        let pageHtml = detail.protyle.element;
        this.addSeqNum(pageHtml);
    }

    addSeqNum(html: any) {
        // 初始化计数器
        let counters = [0, 0, 0, 0, 0, 0];

        // 获取所有标题元素
        let headers = html.querySelectorAll('.protyle-wysiwyg [data-node-id].h1, .protyle-wysiwyg [data-node-id].h2, .protyle-wysiwyg [data-node-id].h3, .protyle-wysiwyg [data-node-id].h4, .protyle-wysiwyg [data-node-id].h5, .protyle-wysiwyg [data-node-id].h6');
        
        let seq_num_storage = sessionStorage.getItem('seq-num');
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
                headers[i].setAttribute('seq-num', this.seq_num[element_id]);
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

            // 创建编号字符串
            let number = '';
            for (let k = 0; k <= level; k++) {
                if (counters[k] > 0)
                {
                    number += counters[k] + '.';
                }
            }

            // 获取number中句号的个数，如果大于1，则删除最后一个句号
            let dotCount = number.split('.').length - 1;
            if (dotCount > 1) {
                number = number.substring(0, number.length - 1);
            }

            // 设置dom元素的编号属性，通过css伪类来显示编号
            headers[i].setAttribute('seq-num', number);
            this.seq_num[element_id] = number;
        }
        sessionStorage.setItem('seq-num', JSON.stringify(this.seq_num));
    }
}
