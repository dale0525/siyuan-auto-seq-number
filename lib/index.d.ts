import { Plugin } from "siyuan";
import { IPluginConfig } from "./types";
export default class HeaderNumberPlugin extends Plugin {
    config: IPluginConfig;
    private statusElement;
    private updateQueue;
    private updateTimer;
    private lastInputTime;
    private settingsPanel;
    onload(): Promise<void>;
    onunload(): Promise<void>;
    private loadConfig;
    saveConfig(): Promise<void>;
    private initStatusBar;
    private initTopBar;
    private onProtyleLoaded;
    private onInput;
    private onDocSwitch;
    private queueUpdate;
    private toggleCurrentDocNumbering;
    private isDocEnabled;
    private updateStatusBar;
    private getCurrentDocId;
    private getDocId;
    private updateDocNumbering;
    private clearDocNumbering;
    private collectHeaders;
}
