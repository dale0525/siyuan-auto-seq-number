[Simplified Chinese](https://github.com/dale0525/siyuan-auto-seq-number//blob/main/README_zh_CN.md)

# SiYuan Note Heading Numbering Plugin
A SiYuan plugin that automatically generates heading numbers.

## Usage
After installing the plugin, a button appears in the top-right corner to generate/clear numbering for the current note. Clicking it toggles between enabled and disabled states. When numbering is enabled for the current note, this button is active.
*Right-click the button to clear all heading numbers in the current note, including numbers originally written in content.*
If the current note is configured as enabled, numbering will also refresh when opening or refreshing the note.
After installation, configure it in plugin settings:
- Default Enable: If enabled, new notes turn on auto numbering by default.
- Real-time Update: If enabled and current note numbering is enabled, numbering updates when creating a new block. (It updates after 2 seconds of inactivity to avoid interrupting editing.)
- h1-h6 heading format: Numbering format for each level (see settings page description).
- Reset: Reset all settings. SiYuan will restart after clicking. Per-document enable/disable states are preserved.

## Known Issues
- Because numbering updates modify the actual content of blocks, there may be short lag when generating or clearing. Avoid editing during that moment.
- Currently, each heading level supports up to 99 items.

## Changelog
### 2.2.0
- Refactored and optimized logic again, improving large-document performance.
- Added "clear all heading numbers", which removes all heading numbering (including user-written numbering) via right-click on the plugin button.

*p.s. It has been almost 3 years since I first published this plugin. I have not personally used SiYuan for over 2 years. I originally planned to leave it as-is, but users kept opening issues, so I decided to maintain it again. Yesterday I used AI and shipped several versions without real testing, which made things messier. Today I reinstalled SiYuan and debugged it properly. At least based on my own testing, it is now stable.*

*I also did not expect this plugin to pass 5000+ downloads. If you run into issues, feel free to open an issue. I will prioritize serious problems.*

*Also, a small self-promo: I am building another note app, [SecondLoop](https://github.com/dale0525/SecondLoop). If you want to write notes freely without heavy structure management, and rely more on search + AI later, you can check it out.*

### 2.1.0
- Rolled back to 2.0.2.

### 2.0.3 - 2.0.X
- Some unsuccessful optimization attempts.

### 2.0.2
- Fixed issues when enabling Chinese numbering.
- Top button now directly reflects per-document enable state; removed status bar hint.
- Optimized settings UI.

### 2.0.1
- Fixed issue where inline formatting in headings disappeared after adding/removing numbering.

### 2.0.0
- Refactored logic: no longer uses pseudo-CSS numbering. It now directly modifies note text content, so numbering also works in outline and export.
- Should have resolved all historical issues.

**Thanks to Cursor for the help**

### 1.0.1
- Fixed `undefined` display when number count was greater than 6.

### 1.0.0
- Added configurable numbering format for each heading level.
- Updates paused unless bug fixes are needed.

### 0.2.0
- Changed trigger event to `loaded-protyle-static` ([#1](https://github.com/dale0525/siyuan-auto-seq-number/issues/1)).
- Switched to `::before` pseudo-element numbering and `SessionStorage` caching to avoid reset on focus ([#2](https://github.com/dale0525/siyuan-auto-seq-number/issues/2), [#3](https://github.com/dale0525/siyuan-auto-seq-number/issues/3)).
