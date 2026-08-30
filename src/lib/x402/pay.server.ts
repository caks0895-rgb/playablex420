import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { TREASURY, USDC_BASE, type PaymentAccept, type Wallet } from "@/lib/engine/types";
import { formatUsdc } from "@/lib/utils";
import { loadMeta, saveMeta } from "@/lib/engine/persist.server";

export function paymentAccept(opts: {
  amount: number;
  resource: string;
  description: string;
  kind: string;
}): PaymentAccept {
  return {
    scheme: "exact",
    network: "base",
    maxAmountRequired: String(opts.amount),
    resource: opts.resource,
    description: opts.description,
    mimeType: "application/json",
    payTo: TREASURY,
    maxTimeoutSeconds: 60,
    asset: USDC_BASE,
    extra: { name: "USD Coin", version: "2", kind: opts.kind },
  };
}

let walletSeed: string | null = null;

export async function initWalletSeed(): Promise<void> {
  if (walletSeed) return;
  const existing = await loadMeta("wallet_seed");
  if (existing && existing.length >= 32) {
    walletSeed = existing;
    return;
  }
  walletSeed = randomBytes(32).toString("hex");
  await saveMeta("wallet_seed", walletSeed);
}

export function walletSecret(walletId: string): string {
  if (!walletSeed) throw new Error("Wallet seed not ready");
  return createHmac("sha256", walletSeed).update(walletId).digest("base64url").slice(0, 24);
}

export function checkSecret(walletId: string, secret: string | undefined | null): boolean {
  if (!secret || typeof secret !== "string") return false;
  const expect = walletSecret(walletId);
  const a = Buffer.from(secret);
  const b = Buffer.from(expect);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type PaymentAuth = { walletId: string; secret: string };

export function parsePaymentHeader(
  header: string | null,
  bodyWalletId?: string,
  bodySecret?: string,
): PaymentAuth | null {
  let walletId = typeof bodyWalletId === "string" ? bodyWalletId.trim() : "";
  let secret = typeof bodySecret === "string" ? bodySecret.trim() : "";
  if (header) {
    const raw = header.trim();
    try {
      const decoded = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
      const parsed = JSON.parse(decoded) as { walletId?: string; from?: string; secret?: string; token?: string };
      if (!walletId && typeof parsed.walletId === "string") walletId = parsed.walletId;
      if (!walletId && typeof parsed.from === "string") walletId = parsed.from;
      if (!secret && typeof parsed.secret === "string") secret = parsed.secret;
      if (!secret && typeof parsed.token === "string") secret = parsed.token;
    } catch {
      /* raw ids are no longer accepted — that was impersonation */
    }
  }
  if (!walletId || !secret) return null;
  if (!checkSecret(walletId, secret)) return null;
  return { walletId, secret };
}

export function debit(wallet: Wallet, amount: number): void {
  if (wallet.balance < amount) {
    throw new PayError(
      `Insufficient balance: ${wallet.name} has ${formatUsdc(wallet.balance)}, needs ${formatUsdc(amount)}`,
    );
  }
  wallet.balance -= amount;
}

export function credit(wallet: Wallet, amount: number): void {
  wallet.balance += amount;
}

export class PayError extends Error {
  constructor(message: string) {
    super(message);
  }
}
