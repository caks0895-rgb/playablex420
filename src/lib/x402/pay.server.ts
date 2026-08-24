import { TREASURY, USDC_BASE, type PaymentAccept, type Wallet } from "@/lib/engine/types";
import { formatUsdc } from "@/lib/utils";

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

export function parsePaymentHeader(
  header: string | null,
  bodyWalletId?: string,
): { walletId: string } | null {
  if (bodyWalletId && bodyWalletId.trim()) {
    return { walletId: bodyWalletId.trim() };
  }
  if (!header) return null;
  const raw = header.trim();
  try {
    const decoded = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as { walletId?: string; from?: string };
    const id = parsed.walletId ?? parsed.from;
    if (typeof id === "string" && id.length > 0) return { walletId: id };
  } catch {
    if (/^[a-zA-Z0-9_-]{2,40}$/.test(raw)) return { walletId: raw };
  }
  return null;
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
    this.name = "PayError";
  }
}
