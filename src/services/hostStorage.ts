import * as vscode from 'vscode';
import { HostEntry } from '../models/host';

const HOSTS_STORAGE_KEY = 'gpuSshManager.hosts';

/**
 * Persists host metadata in VS Code global state.
 */
export class HostStorage {
  constructor(private readonly context: vscode.ExtensionContext) {}

  /** Returns all known SSH hosts sorted by alias. */
  public getAll(): HostEntry[] {
    return this.context.globalState.get<HostEntry[]>(HOSTS_STORAGE_KEY, []);
  }

  /** Inserts or replaces a host entry by alias. */
  public async upsert(host: HostEntry): Promise<void> {
    const existingHosts = this.getAll();
    const nextHosts = existingHosts.filter((h) => h.alias !== host.alias);
    nextHosts.push(host);
    nextHosts.sort((a, b) => a.alias.localeCompare(b.alias));
    await this.context.globalState.update(HOSTS_STORAGE_KEY, nextHosts);
  }

  /** Deletes a host entry by alias. */
  public async delete(alias: string): Promise<void> {
    const nextHosts = this.getAll().filter((host) => host.alias !== alias);
    await this.context.globalState.update(HOSTS_STORAGE_KEY, nextHosts);
  }

  /** Finds a host by alias. */
  public findByAlias(alias: string): HostEntry | undefined {
    return this.getAll().find((host) => host.alias === alias);
  }
}
