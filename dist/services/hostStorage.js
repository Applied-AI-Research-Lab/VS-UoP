"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostStorage = void 0;
const HOSTS_STORAGE_KEY = 'gpuSshManager.hosts';
/**
 * Persists host metadata in VS Code global state.
 */
class HostStorage {
    context;
    constructor(context) {
        this.context = context;
    }
    /** Returns all known SSH hosts sorted by alias. */
    getAll() {
        return this.context.globalState.get(HOSTS_STORAGE_KEY, []);
    }
    /** Inserts or replaces a host entry by alias. */
    async upsert(host) {
        const existingHosts = this.getAll();
        const nextHosts = existingHosts.filter((h) => h.alias !== host.alias);
        nextHosts.push(host);
        nextHosts.sort((a, b) => a.alias.localeCompare(b.alias));
        await this.context.globalState.update(HOSTS_STORAGE_KEY, nextHosts);
    }
    /** Deletes a host entry by alias. */
    async delete(alias) {
        const nextHosts = this.getAll().filter((host) => host.alias !== alias);
        await this.context.globalState.update(HOSTS_STORAGE_KEY, nextHosts);
    }
    /** Finds a host by alias. */
    findByAlias(alias) {
        return this.getAll().find((host) => host.alias === alias);
    }
}
exports.HostStorage = HostStorage;
//# sourceMappingURL=hostStorage.js.map