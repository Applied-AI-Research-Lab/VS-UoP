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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
const hostStorage_1 = require("./services/hostStorage");
const remoteBootstrapService_1 = require("./services/remoteBootstrapService");
const sshConfigManager_1 = require("./services/sshConfigManager");
const hostTreeProvider_1 = require("./ui/hostTreeProvider");
const HOSTS_VIEW_ID = 'gpuSshManager.hostsView';
function activate(context) {
    const hostStorage = new hostStorage_1.HostStorage(context);
    const sshConfigManager = new sshConfigManager_1.SshConfigManager();
    const remoteBootstrap = new remoteBootstrapService_1.RemoteBootstrapService();
    const treeProvider = new hostTreeProvider_1.HostTreeProvider(hostStorage);
    const treeView = vscode.window.createTreeView(HOSTS_VIEW_ID, {
        treeDataProvider: treeProvider,
        showCollapseAll: false
    });
    context.subscriptions.push(treeView);
    context.subscriptions.push(vscode.commands.registerCommand('gpuSshManager.refreshHosts', () => {
        treeProvider.refresh();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('gpuSshManager.addHost', async () => {
        const hostName = await vscode.window.showInputBox({
            title: 'Add SSH Host',
            prompt: 'Enter host FQDN or IP address',
            ignoreFocusOut: true,
            validateInput: (value) => (value.trim().length === 0 ? 'Host name cannot be empty.' : null)
        });
        if (!hostName) {
            return;
        }
        const user = await vscode.window.showInputBox({
            title: 'Add SSH Host',
            prompt: 'Enter SSH username',
            ignoreFocusOut: true,
            validateInput: (value) => (value.trim().length === 0 ? 'Username cannot be empty.' : null)
        });
        if (!user) {
            return;
        }
        const suggestedAlias = toHostAlias(hostName);
        const alias = await vscode.window.showInputBox({
            title: 'Add SSH Host',
            prompt: 'Enter host alias used in SSH config',
            value: suggestedAlias,
            ignoreFocusOut: true,
            validateInput: (value) => (value.trim().length === 0 ? 'Alias cannot be empty.' : null)
        });
        if (!alias) {
            return;
        }
        const identityFile = vscode.workspace
            .getConfiguration('gpuSshManager')
            .get('defaultIdentityFile', '~/.ssh/id_ed25519');
        let resolvedIdentityFile;
        if (identityFile.trim().length > 0) {
            const expandedPath = identityFile.startsWith('~/')
                ? identityFile.replace('~', os.homedir())
                : identityFile;
            if (fs.existsSync(expandedPath)) {
                resolvedIdentityFile = identityFile;
            }
        }
        const host = {
            alias: alias.trim(),
            hostName: hostName.trim(),
            user: user.trim(),
            identityFile: resolvedIdentityFile
        };
        try {
            await sshConfigManager.upsertHost(host);
            await hostStorage.upsert(host);
            treeProvider.refresh();
            vscode.window.showInformationMessage(`SSH host '${host.alias}' saved.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to save host '${host.alias}': ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('gpuSshManager.removeHost', async (selectedHost) => {
        let hostToDelete = selectedHost;
        if (!hostToDelete) {
            const allHosts = hostStorage.getAll();
            if (allHosts.length === 0) {
                vscode.window.showInformationMessage('No hosts to remove.');
                return;
            }
            const pick = await vscode.window.showQuickPick(allHosts.map((host) => ({
                label: host.alias,
                description: `${host.user}@${host.hostName}`,
                host
            })), {
                title: 'Remove SSH Host',
                placeHolder: 'Select a host to remove',
                ignoreFocusOut: true
            });
            hostToDelete = pick?.host;
        }
        if (!hostToDelete) {
            return;
        }
        const confirmation = await vscode.window.showWarningMessage(`Remove SSH host '${hostToDelete.alias}' from list and SSH config?`, { modal: true }, 'Remove');
        if (confirmation !== 'Remove') {
            return;
        }
        try {
            await sshConfigManager.removeHost(hostToDelete.alias);
            await hostStorage.delete(hostToDelete.alias);
            treeProvider.refresh();
            vscode.window.showInformationMessage(`SSH host '${hostToDelete.alias}' removed.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to remove host '${hostToDelete.alias}': ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('gpuSshManager.connectHost', async (selectedHost) => {
        let hostToConnect = selectedHost;
        if (!hostToConnect) {
            const allHosts = hostStorage.getAll();
            if (allHosts.length === 0) {
                vscode.window.showInformationMessage('No hosts available. Add one first.');
                return;
            }
            const pick = await vscode.window.showQuickPick(allHosts.map((host) => ({
                label: host.alias,
                description: `${host.user}@${host.hostName}`,
                host
            })), {
                title: 'Connect to SSH Host',
                placeHolder: 'Select a host to connect',
                ignoreFocusOut: true
            });
            hostToConnect = pick?.host;
        }
        if (!hostToConnect) {
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Connecting to ${hostToConnect.alias}`,
            cancellable: false
        }, async () => {
            try {
                await remoteBootstrap.connectToHost(hostToConnect);
                vscode.window.showInformationMessage(`Connected to '${hostToConnect.alias}'.`);
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Connection failed for '${hostToConnect.alias}': ${message}`);
            }
        });
    }));
}
function deactivate() {
    // Nothing to clean up explicitly.
}
function toHostAlias(hostName) {
    const base = hostName.trim().toLowerCase().split('.')[0] ?? hostName.trim().toLowerCase();
    return base.replace(/[^a-z0-9_-]/g, '-') || 'host';
}
//# sourceMappingURL=extension.js.map