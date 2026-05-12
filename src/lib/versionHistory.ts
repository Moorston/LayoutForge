/**
 * Code Version History Manager
 * Stores snapshots of generated code in memory with diff and rollback support.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface VersionEntry {
  id: string;
  timestamp: number;
  html: string;
  css: string;
  label: string;
  source: string;
}

export interface DiffResult {
  additions: string[];
  deletions: string[];
  changes: Array<{ old: string; new: string; line: number }>;
}

// ─── Manager ─────────────────────────────────────────────────────────────────

/**
 * In-memory version history manager for HTML/CSS code snapshots.
 * Avoids localStorage to prevent quota issues with large HTML payloads.
 */
export class VersionHistoryManager {
  private versions: VersionEntry[] = [];
  private counter = 0;

  /**
   * Save a new snapshot to history.
   */
  push(html: string, css: string, label: string, source: string): void {
    this.counter++;
    const entry: VersionEntry = {
      id: `v-${this.counter}-${Date.now()}`,
      timestamp: Date.now(),
      html,
      css,
      label,
      source,
    };
    this.versions.push(entry);
  }

  /**
   * Get all versions in chronological order (oldest first).
   */
  getAll(): VersionEntry[] {
    return [...this.versions];
  }

  /**
   * Get a specific version by ID.
   */
  getById(id: string): VersionEntry | null {
    return this.versions.find((v) => v.id === id) ?? null;
  }

  /**
   * Get the latest version.
   */
  getLatest(): VersionEntry | null {
    return this.versions.length > 0
      ? this.versions[this.versions.length - 1]
      : null;
  }

  /**
   * Compute a simple line-by-line diff between two versions.
   * Compares the combined HTML+CSS content.
   */
  diff(id1: string, id2: string): DiffResult {
    const v1 = this.getById(id1);
    const v2 = this.getById(id2);

    if (!v1 || !v2) {
      throw new Error("One or both version IDs not found.");
    }

    const lines1 = `${v1.html}\n/* --- CSS --- */\n${v1.css}`.split("\n");
    const lines2 = `${v2.html}\n/* --- CSS --- */\n${v2.css}`.split("\n");

    const additions: string[] = [];
    const deletions: string[] = [];
    const changes: Array<{ old: string; new: string; line: number }> = [];

    const maxLen = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLen; i++) {
      const old = i < lines1.length ? lines1[i] : "";
      const cur = i < lines2.length ? lines2[i] : "";

      if (old !== cur) {
        if (old && !cur) {
          deletions.push(`- ${old}`);
        } else if (!old && cur) {
          additions.push(`+ ${cur}`);
        } else {
          changes.push({ old, new: cur, line: i + 1 });
        }
      }
    }

    return { additions, deletions, changes };
  }

  /**
   * Get a version to rollback to. Returns the version entry
   * which the caller can use to restore the code.
   */
  rollback(id: string): VersionEntry {
    const entry = this.getById(id);
    if (!entry) {
      throw new Error(`Version ${id} not found.`);
    }

    // Remove all versions after the rollback target
    const idx = this.versions.findIndex((v) => v.id === id);
    if (idx >= 0) {
      this.versions = this.versions.slice(0, idx + 1);
    }

    return entry;
  }

  /**
   * Clear all version history.
   */
  clear(): void {
    this.versions = [];
    this.counter = 0;
  }

  /**
   * Get the total number of stored versions.
   */
  get size(): number {
    return this.versions.length;
  }
}

// ─── Singleton instance ──────────────────────────────────────────────────────

let _instance: VersionHistoryManager | null = null;

/**
 * Returns the singleton version history manager.
 */
export function getVersionHistory(): VersionHistoryManager {
  if (!_instance) {
    _instance = new VersionHistoryManager();
  }
  return _instance;
}
