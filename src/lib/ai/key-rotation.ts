/**
 * Independent round-robin rotation with cooldown-based health tracking, one instance
 * per provider. State is in-memory only and intentionally resets on restart — key
 * rotation indexes don't need to survive a process restart, and adding a database
 * just to persist them would be overkill for this use case.
 *
 * JavaScript's single-threaded event loop means `next()` never races with itself
 * across concurrent requests: the index read-and-increment below has no `await` in
 * the middle, so it always completes atomically before another call can run.
 */
class ProviderKeyRotator {
  private index = 0;
  private cooldowns = new Map<string, number>();

  constructor(private keys: string[]) {}

  private isOnCooldown(key: string): boolean {
    const until = this.cooldowns.get(key);
    return until !== undefined && until > Date.now();
  }

  /** Returns the next key that isn't on cooldown, rotating through the pool. Returns null if every key is currently cooling down. */
  next(): string | null {
    const total = this.keys.length;
    if (total === 0) return null;

    for (let attempt = 0; attempt < total; attempt++) {
      const key = this.keys[this.index % total];
      this.index = (this.index + 1) % total;
      if (!this.isOnCooldown(key)) return key;
    }
    return null;
  }

  markFailure(key: string, cooldownMs: number): void {
    if (cooldownMs <= 0) return;
    this.cooldowns.set(key, Date.now() + cooldownMs);
  }

  markSuccess(key: string): void {
    this.cooldowns.delete(key);
  }

  get size(): number {
    return this.keys.length;
  }
}

const rotators = new Map<string, ProviderKeyRotator>();

/** Gets (or lazily creates) the rotator for a provider. Rebuilds it if the configured key list changed. */
export function getRotator(providerName: string, keys: string[]): ProviderKeyRotator {
  const existing = rotators.get(providerName);
  if (existing && existing.size === keys.length) {
    return existing;
  }
  const rotator = new ProviderKeyRotator(keys);
  rotators.set(providerName, rotator);
  return rotator;
}

/** Never log or expose full API keys — only this masked form. */
export function maskKey(key: string): string {
  if (key.length <= 4) return "****";
  return `****${key.slice(-4)}`;
}
