[简体中文](https://github.com/dale0525/siyuan-auto-seq-number//blob/main/README_zh_CN.md)

# SiYuan Note Title Auto Numbering Plugin
A plugin for SiYuan Note that automatically generates numbers for headings.

## Usage
After installing the plugin, a button will be added to the top-right corner to generate/clear numbers for the current note. Clicking it will toggle between generation and clearing states. The current generation status of the note will also be displayed in the status bar at the bottom right.
If the current note is configured to be generated, the numbers will be refreshed when opening or refreshing the note.
After installation, please go to the plugin settings page first:
- Default Enable: If turned on, new notes will have the number generation feature enabled by default
- Real-time Update: If turned on and the current note has number generation enabled, it will trigger number updates when creating a new block. (Updates after 2 seconds of stopping input to prevent interruption of ongoing edits)

  **Since updating numbers will trigger updates to the actual content of all blocks, it may cause some lag. Please enable with discretion.*
- h1-h6 heading format: The format of generated numbers, see settings page description
- Reset: Initialize settings. Will restart SiYuan Note after clicking. Will not delete settings for whether individual documents have number generation enabled.

## Known Issues
- Since updating numbers triggers updates to the actual content of all blocks, there may be brief lag during generation and clearing. It is recommended to avoid editing during this time.
- Currently only supports up to 99 headings at the same level (should be sufficient)

## Changelog
### 2.0.0
- Refactored logic, no longer using pseudo-css to display heading numbers, but directly modifying the text content in notes. Therefore, it remains effective in outline and export.
- Should resolve all issues.

**Thanks to cursor for assistance*

### 1.0.1
- Fixed issue where undefined was displayed when numbers were greater than 6

### 1.0.0
- Settings can customize numbers for each heading level
- Pausing updates unless there are bugs

### 0.2.0
- Changed trigger event to `loaded-protyle-static` ([#1](https://github.com/dale0525/siyuan-auto-seq-number/issues/1))
- Changed to use ::before pseudo-element to implement numbering, and use SessionStorage to cache numbers to avoid number reset when focusing ([#2](https://github.com/dale0525/siyuan-auto-seq-number/issues/2), [#3](https://github.com/dale0525/siyuan-auto-seq-number/issues/3))

## 安装方法

1. 下载发布包
2. 解压到思源笔记的插件目录
3. 重启思源笔记
4. 在设置中启用插件

## 使用说明

### 基本使用

1. 在顶部工具栏中点击序号图标可以切换当前文档的序号状态
2. 在状态栏可以查看当前文档的序号状态
3. 编辑文档时，序号会自动更新

### 配置说明

在插件设置面板中可以进行以下配置：

1. 设置默认是否启用序号
2. 为每一级标题设置序号格式
   - 使用 `{1}`, `{2}` 等作为序号占位符
   - 例如：`{1}.` 会显示为 "1."
   - 例如：`{1}.{2}` 会显示为 "1.1"
3. 为每一级标题选择是否使用中文数字

### 序号格式示例

- `{1}. ` → "1. "
- `{1}.{2} ` → "1.1 "
- `第{1}章 ` → "第一章 "（当启用中文数字时）
- `{1}.{2}.{3} ` → "1.1.1 "

## 注意事项

1. 序号更新有2秒的防抖延迟，以避免频繁更新
2. 建议不要手动编辑序号，让插件自动管理
3. 如果手动修改了标题层级，序号会自动调整

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

## 许可证

MIT License