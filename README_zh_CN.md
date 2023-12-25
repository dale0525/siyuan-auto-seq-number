[English](https://github.com/dale0525/siyuan-auto-seq-number//blob/main/README.md)

# 思源笔记序号插件
自动为标题生成序号的思源笔记插件。

## 使用方法
打开插件，刷新页面即可。

## 更新日志
- 触发事件改为`loaded-protyle-static`([#1](https://github.com/dale0525/siyuan-auto-seq-number/issues/1))
- 改用::before伪元素实现序号，并使用SessionStorage缓存序号，避免聚焦时序号重置([#2](https://github.com/dale0525/siyuan-auto-seq-number/issues/2), [#3](https://github.com/dale0525/siyuan-auto-seq-number/issues/1))