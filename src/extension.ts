import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { HostEntry } from './models/host';
import { HostStorage } from './services/hostStorage';
import { RemoteBootstrapService } from './services/remoteBootstrapService';
import { SshConfigManager } from './services/sshConfigManager';
import { HostTreeProvider } from './ui/hostTreeProvider';

const HOSTS_VIEW_ID = 'gpuSshManager.hostsView';

export function activate(context: vscode.ExtensionContext): void {
  const hostStorage = new HostStorage(context);
  const sshConfigManager = new SshConfigManager();
  const remoteBootstrap = new RemoteBootstrapService();
  const treeProvider = new HostTreeProvider(hostStorage);

  const treeView = vscode.window.createTreeView(HOSTS_VIEW_ID, {
    treeDataProvider: treeProvider,
    showCollapseAll: false
  });

  context.subscriptions.push(treeView);

  context.subscriptions.push(
    vscode.commands.registerCommand('gpuSshManager.refreshHosts', () => {
      treeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gpuSshManager.addHost', async () => {
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
        .get<string>('defaultIdentityFile', '~/.ssh/id_ed25519');

      let resolvedIdentityFile: string | undefined;
      if (identityFile.trim().length > 0) {
        const expandedPath = identityFile.startsWith('~/')
          ? identityFile.replace('~', os.homedir())
          : identityFile;

        if (fs.existsSync(expandedPath)) {
          resolvedIdentityFile = identityFile;
        }
      }

      const host: HostEntry = {
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
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to save host '${host.alias}': ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gpuSshManager.removeHost', async (selectedHost?: HostEntry) => {
      let hostToDelete = selectedHost;

      if (!hostToDelete) {
        const allHosts = hostStorage.getAll();
        if (allHosts.length === 0) {
          vscode.window.showInformationMessage('No hosts to remove.');
          return;
        }

        const pick = await vscode.window.showQuickPick(
          allHosts.map((host) => ({
            label: host.alias,
            description: `${host.user}@${host.hostName}`,
            host
          })),
          {
            title: 'Remove SSH Host',
            placeHolder: 'Select a host to remove',
            ignoreFocusOut: true
          }
        );

        hostToDelete = pick?.host;
      }

      if (!hostToDelete) {
        return;
      }

      const confirmation = await vscode.window.showWarningMessage(
        `Remove SSH host '${hostToDelete.alias}' from list and SSH config?`,
        { modal: true },
        'Remove'
      );

      if (confirmation !== 'Remove') {
        return;
      }

      try {
        await sshConfigManager.removeHost(hostToDelete.alias);
        await hostStorage.delete(hostToDelete.alias);
        treeProvider.refresh();
        vscode.window.showInformationMessage(`SSH host '${hostToDelete.alias}' removed.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to remove host '${hostToDelete.alias}': ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gpuSshManager.connectHost', async (selectedHost?: HostEntry) => {
      let hostToConnect = selectedHost;

      if (!hostToConnect) {
        const allHosts = hostStorage.getAll();
        if (allHosts.length === 0) {
          vscode.window.showInformationMessage('No hosts available. Add one first.');
          return;
        }

        const pick = await vscode.window.showQuickPick(
          allHosts.map((host) => ({
            label: host.alias,
            description: `${host.user}@${host.hostName}`,
            host
          })),
          {
            title: 'Connect to SSH Host',
            placeHolder: 'Select a host to connect',
            ignoreFocusOut: true
          }
        );

        hostToConnect = pick?.host;
      }

      if (!hostToConnect) {
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Connecting to ${hostToConnect.alias}`,
          cancellable: false
        },
        async () => {
          try {
            await remoteBootstrap.connectToHost(hostToConnect!);
            vscode.window.showInformationMessage(`Connected to '${hostToConnect!.alias}'.`);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Connection failed for '${hostToConnect!.alias}': ${message}`);
          }
        }
      );
    })
  );
}

export function deactivate(): void {
  // Nothing to clean up explicitly.
}

function toHostAlias(hostName: string): string {
  const base = hostName.trim().toLowerCase().split('.')[0] ?? hostName.trim().toLowerCase();
  return base.replace(/[^a-z0-9_-]/g, '-') || 'host';
}
