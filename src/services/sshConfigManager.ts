import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { HostEntry } from '../models/host';

/**
 * Handles deterministic updates to the user's SSH config file.
 */
export class SshConfigManager {
  private readonly sshDir = path.join(os.homedir(), '.ssh');
  private readonly configPath = path.join(this.sshDir, 'config');

  /** Creates or replaces a Host block matching the provided alias. */
  public async upsertHost(host: HostEntry): Promise<void> {
    await fs.mkdir(this.sshDir, { recursive: true });

    let config = '';
    try {
      config = await fs.readFile(this.configPath, 'utf8');
    } catch {
      config = '';
    }

    const withoutTarget = this.removeHostBlock(config, host.alias);
    const block = this.renderHostBlock(host);
    const normalized = withoutTarget.trim();
    const nextConfig = normalized.length > 0 ? `${normalized}\n\n${block}\n` : `${block}\n`;
    await fs.writeFile(this.configPath, nextConfig, { encoding: 'utf8', mode: 0o600 });
  }

  /** Removes the Host block matching the provided alias. */
  public async removeHost(alias: string): Promise<void> {
    let config = '';
    try {
      config = await fs.readFile(this.configPath, 'utf8');
    } catch {
      return;
    }

    const nextConfig = this.removeHostBlock(config, alias).trim();
    const content = nextConfig.length > 0 ? `${nextConfig}\n` : '';
    await fs.writeFile(this.configPath, content, { encoding: 'utf8', mode: 0o600 });
  }

  /** Removes a Host section and any nested directives from raw SSH config text. */
  private removeHostBlock(config: string, alias: string): string {
    const lines = config.split(/\r?\n/);
    const result: string[] = [];
    let skip = false;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const hostMatch = /^\s*Host\s+(.+)\s*$/i.exec(line);

      if (hostMatch) {
        const hostTokens = hostMatch[1]
          .split(/\s+/)
          .map((token) => token.trim())
          .filter(Boolean);

        const isTarget = hostTokens.includes(alias);
        skip = isTarget;
      }

      if (!skip) {
        result.push(line);
      }
    }

    return result.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  /** Renders a canonical SSH Host block from host metadata. */
  private renderHostBlock(host: HostEntry): string {
    const lines = [
      `Host ${host.alias}`,
      `    HostName ${host.hostName}`,
      `    User ${host.user}`
    ];

    if (host.identityFile && host.identityFile.trim().length > 0) {
      lines.push(`    IdentityFile ${host.identityFile}`);
    }

    return lines.join('\n');
  }
}
