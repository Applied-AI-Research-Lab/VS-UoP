"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Supplies host items to the sidebar tree view.
 */
class HostTreeProvider {
    hostStorage;
    emitter = new vscode.EventEmitter();
    onDidChangeTreeData = this.emitter.event;
    constructor(hostStorage) {
        this.hostStorage = hostStorage;
    }
    /** Triggers a full tree refresh. */
    refresh() {
        this.emitter.fire();
    }
    /** Builds a single tree item for a host entry. */
    getTreeItem(element) {
        const item = new vscode.TreeItem(element.alias, vscode.TreeItemCollapsibleState.None);
        item.description = `${element.user}@${element.hostName}`;
        item.tooltip = `${element.alias}\n${element.user}@${element.hostName}`;
        item.contextValue = 'sshHostItem';
        item.iconPath = new vscode.ThemeIcon('server-environment');
        item.command = {
            command: 'gpuSshManager.connectHost',
            title: 'Connect',
            arguments: [element]
        };
        return item;
    }
    /** Returns all hosts to display in the tree. */
    getChildren() {
        return this.hostStorage.getAll();
    }
}
exports.HostTreeProvider = HostTreeProvider;
//# sourceMappingURL=hostTreeProvider.js.map