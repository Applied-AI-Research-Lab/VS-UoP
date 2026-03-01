import * as vscode from 'vscode';
import { HostEntry } from '../models/host';
import { HostStorage } from '../services/hostStorage';

/**
 * Supplies host items to the sidebar tree view.
 */
export class HostTreeProvider implements vscode.TreeDataProvider<HostEntry> {
  private readonly emitter = new vscode.EventEmitter<HostEntry | undefined | void>();
  public readonly onDidChangeTreeData = this.emitter.event;

  constructor(private readonly hostStorage: HostStorage) {}

  /** Triggers a full tree refresh. */
  public refresh(): void {
    this.emitter.fire();
  }

  /** Builds a single tree item for a host entry. */
  public getTreeItem(element: HostEntry): vscode.TreeItem {
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
  public getChildren(): HostEntry[] {
    return this.hostStorage.getAll();
  }
}
