[中文](https://github.com/dale0525/siyuan-auto-seq-number/blob/main/README_zh_CN.md)

# SiYuan Auto Sequence Number Plugin
A SiYuan Plugin to auto generate sequence number for titles.

## Usage
Just turn on the plugin, and refresh the page.

## Known Issues
- The sequence number is only rendered in SiYuan Note but will not change the original article, so the numbers will not be exported to other formats.

## Change Log
### 0.2.0
- change event bus to `loaded-protyle-static`([#1](https://github.com/dale0525/siyuan-auto-seq-number/issues/1))
- display seq number using `::befor` and cache result using SessionStorage, so that the seq number won't be reset when focusing on a block([#2](https://github.com/dale0525/siyuan-auto-seq-number/issues/2), [#3](https://github.com/dale0525/siyuan-auto-seq-number/issues/3))