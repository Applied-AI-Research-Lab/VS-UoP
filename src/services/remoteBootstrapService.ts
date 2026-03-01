import * as vscode from 'vscode';
import { HostEntry } from '../models/host';

/**
 * Handles Remote SSH connection handoff.
 */
export class RemoteBootstrapService {
  /** Opens a Remote SSH window for the selected host. */
  public async connectToHost(host: HostEntry): Promise<void> {
    const remoteSshExtension = vscode.extensions.getExtension('ms-vscode-remote.remote-ssh');
    if (!remoteSshExtension) {
      throw new Error('Remote SSH extension (ms-vscode-remote.remote-ssh) is required.');
    }

    const remoteRootUri = vscode.Uri.parse(`vscode-remote://ssh-remote+${encodeURIComponent(host.alias)}/`);
    await vscode.commands.executeCommand('vscode.openFolder', remoteRootUri, { forceNewWindow: true });
  }
}
