import {
    Plugin,
} from "siyuan";

export default class AutoSeqNumPlugin extends Plugin {

    onLoadedProtyleBindThis = this.onLoadedProtyle.bind(this);

    onload() {
        this.eventBus.on("switch-protyle", this.onLoadedProtyleBindThis);
    }

    onunload() {
        this.eventBus.off("switch-protyle", this.onLoadedProtyleBindThis);
    }

    async onLoadedProtyle({detail}: any){
        let pageHtml = detail.protyle.element;
        // console.log(pageHtml);
        if (pageHtml.getAttribute('seq-num') === 'true') {
            return;
        }

        // 初始化计数器
        let counters = [0, 0, 0, 0, 0, 0];

        // 获取所有标题元素
        let headers = pageHtml.querySelectorAll('.h1, .h2, .h3, .h4, .h5, .h6');
        // console.log(headers);

        // 遍历所有标题元素
        for (let i = 0; i < headers.length; i++) {
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

            // 在标题前添加编号
            headers[i].innerText = headers[i].innerText.replace('\n', '');
            headers[i].innerText = number + ' ' + headers[i].innerText;
        }
        pageHtml.setAttribute('seq-num', 'true');
    }
}
