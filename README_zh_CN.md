[English](https://github.com/dale0525/siyuan-auto-seq-number//blob/main/README.md)

# 思源笔记标题序号插件
自动为标题生成序号的思源笔记插件。

## 使用方法
打开插件，刷新页面即可。

## 已知问题
- 序号只在思源笔记中渲染，不会改变原文档，所以不会被导出到其他格式。

## 更新日志
### 1.0.0
- 设置项可自定义每个标题级别的序号
- 暂停更新，除非有bug

### 0.2.0
- 触发事件改为`loaded-protyle-static`( [#1](https://github.com/dale0525/siyuan-auto-seq-number/issues/1) )
- 改用::before伪元素实现序号，并使用SessionStorage缓存序号，避免聚焦时序号重置( [#2](https://github.com/dale0525/siyuan-auto-seq-number/issues/2), [#3](https://github.com/dale0525/siyuan-auto-seq-number/issues/3) )