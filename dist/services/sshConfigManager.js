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
exports.SshConfigManager = void 0;
const fs = __importStar(require("node:fs/promises"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
/**
 * Handles deterministic updates to the user's SSH config file.
 */
class SshConfigManager {
    sshDir = path.join(os.homedir(), '.ssh');
    configPath = path.join(this.sshDir, 'config');
    /** Creates or replaces a Host block matching the provided alias. */
    async upsertHost(host) {
        await fs.mkdir(this.sshDir, { recursive: true });
        let config = '';
        try {
            config = await fs.readFile(this.configPath, 'utf8');
        }
        catch {
            config = '';
        }
        const withoutTarget = this.removeHostBlock(config, host.alias);
        const block = this.renderHostBlock(host);
        const normalized = withoutTarget.trim();
        const nextConfig = normalized.length > 0 ? `${normalized}\n\n${block}\n` : `${block}\n`;
        await fs.writeFile(this.configPath, nextConfig, { encoding: 'utf8', mode: 0o600 });
    }
    /** Removes the Host block matching the provided alias. */
    async removeHost(alias) {
        let config = '';
        try {
            config = await fs.readFile(this.configPath, 'utf8');
        }
        catch {
            return;
        }
        const nextConfig = this.removeHostBlock(config, alias).trim();
        const content = nextConfig.length > 0 ? `${nextConfig}\n` : '';
        await fs.writeFile(this.configPath, content, { encoding: 'utf8', mode: 0o600 });
    }
    /** Removes a Host section and any nested directives from raw SSH config text. */
    removeHostBlock(config, alias) {
        const lines = config.split(/\r?\n/);
        const result = [];
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
    renderHostBlock(host) {
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
exports.SshConfigManager = SshConfigManager;
//# sourceMappingURL=sshConfigManager.js.map