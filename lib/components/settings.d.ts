import type HeaderNumberPlugin from "../index";
export declare class SettingsPanel {
    private plugin;
    private settingPanel;
    constructor(plugin: HeaderNumberPlugin);
    private initPanel;
    private addGlobalEnableSetting;
    private addHeaderLevelSettings;
    private addResetButton;
    private saveSettings;
    private resetSettings;
}
