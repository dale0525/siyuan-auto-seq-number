[Simplified Chinese](https://github.com/dale0525/siyuan-auto-seq-number//blob/main/README_zh_CN.md)

# SiYuan Note Heading Numbering Plugin
A SiYuan plugin that automatically generates heading numbers.

## Notice

The previous release introduced serious problems. See [#38](https://github.com/dale0525/siyuan-auto-seq-number/issues/38). That was my mistake, and I apologize to affected users.

I originally built this plugin because I needed heading auto-numbering myself, and it ended up being used by many people. But honestly, I believe this is the kind of basic functionality that should be provided by SiYuan itself rather than relying on a third-party plugin long-term. With SiYuan's current dynamically loaded block model and limited batch APIs, making this stable in a plugin is much harder than it should be.

I have not personally used SiYuan for more than two years. I kept maintaining this plugin mainly out of responsibility to existing users, but without using it myself, I naturally miss many real-world testing scenarios.

This plugin was also taken down because of the previous broken release, and that gives me a reasonable point to stop maintaining it further. I do not plan to continue active updates for this repository.

If you still need this plugin, feel free to fork it and continue maintaining it.

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
### 2.2.2
- Fixed the invisible-character and state persistence issues introduced by the previous release ([#38](https://github.com/dale0525/siyuan-auto-seq-number/issues/38))
- Moved plugin state storage to block attributes and cleaned up legacy marker data
- Fixed heading numbering persistence and cleanup behavior in newer SiYuan versions

### 2.2.1
- Refactored and optimized logic again, improving large-document performance.
- Added "clear all heading numbers", which removes all heading numbering (including user-written numbering) via right-click on the plugin button.

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
