/** In-memory token buckets. Fine for one Node process / preview isolate. */

interface Bucket {
  tokens: number;
  ts: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 30_000) return;
  lastSweep = now;
  if (buckets.size < 400) return;
  for (const [k, b] of buckets) {
    if (now - b.ts > 60_000) buckets.delete(k);
  }
}

export function allow(key: string, perSec: number, burst: number): boolean {
  const now = Date.now();
  sweep(now);
  let b = buckets.get(key);
  if (!b) {
    b = { tokens: burst, ts: now };
    buckets.set(key, b);
  }
  const elapsed = (now - b.ts) / 1000;
  b.tokens = Math.min(burst, b.tokens + elapsed * perSec);
  b.ts = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64);
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim().slice(0, 64);
  return "local";
}
