import { getSql } from "@/lib/db";
import type { LedgerEntry, Match, Wallet } from "./types";
import { safeBalance } from "./types";

interface WalletRow {
  id: string;
  name: string;
  balance: number;
  created_at: number;
}

interface MatchRow {
  id: string;
  payload: unknown;
}

interface LedgerRow {
  id: string;
  ts: number;
  from_id: string;
  to_id: string;
  amount: number;
  kind: LedgerEntry["kind"];
  match_id: string | null;
  note: string;
}

function asMatch(raw: unknown): Match {
  if (typeof raw === "string") return JSON.parse(raw) as Match;
  return raw as Match;
}

async function ensureMeta(sql: Awaited<ReturnType<typeof getSql>>): Promise<void> {
  await sql.query(
    `create table if not exists meta (
      key   text primary key,
      value text not null
    )`,
  );
}

export async function loadAll(): Promise<{
  wallets: Wallet[];
  matches: Match[];
  ledger: LedgerEntry[];
  houseBots: boolean;
}> {
  const sql = await getSql();
  await ensureMeta(sql);
  const walletRows = await sql<WalletRow>`
    select id, name, balance, created_at from wallets order by name
  `;
  const matchRows = await sql<MatchRow>`
    select id, payload from matches order by created_at desc limit 80
  `;
  const ledgerRows = await sql<LedgerRow>`
    select id, ts, from_id, to_id, amount, kind, match_id, note from ledger order by ts desc limit 400
  `;
  const metaRows = await sql<{ value: string }>`
    select value from meta where key = 'house_bots'
  `;
  const raw = metaRows[0]?.value;
  return {
    wallets: walletRows.map((r) => ({
      id: r.id,
      name: r.name,
      balance: safeBalance(r.balance),
      createdAt: Number(r.created_at),
    })),
    matches: matchRows.map((r) => asMatch(r.payload)),
    ledger: ledgerRows.map((r) => ({
      id: r.id,
      ts: Number(r.ts),
      from: r.from_id,
      to: r.to_id,
      amount: Number(r.amount),
      kind: r.kind,
      matchId: r.match_id ?? undefined,
      note: r.note,
    })),
    houseBots: raw == null ? false : raw !== "0" && raw !== "false",
  };
}

export async function loadMatch(id: string): Promise<Match | undefined> {
  const sql = await getSql();
  const rows = await sql<MatchRow>`
    select id, payload from matches where id = ${id} limit 1
  `;
  const row = rows[0];
  return row ? asMatch(row.payload) : undefined;
}

export async function loadMatches(): Promise<Match[]> {
  const sql = await getSql();
  const rows = await sql<MatchRow>`
    select id, payload from matches order by created_at desc limit 80
  `;
  return rows.map((r) => asMatch(r.payload));
}

export async function loadWallet(id: string): Promise<Wallet | undefined> {
  const sql = await getSql();
  const rows = await sql<WalletRow>`
    select id, name, balance, created_at from wallets where id = ${id} limit 1
  `;
  const r = rows[0];
  if (!r) return undefined;
  return {
    id: r.id,
    name: r.name,
    balance: safeBalance(r.balance),
    createdAt: Number(r.created_at),
  };
}

export async function loadWallets(): Promise<Wallet[]> {
  const sql = await getSql();
  const rows = await sql<WalletRow>`
    select id, name, balance, created_at from wallets order by name
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    balance: safeBalance(r.balance),
    createdAt: Number(r.created_at),
  }));
}

export async function saveHouseBots(on: boolean): Promise<void> {
  await saveMeta("house_bots", on ? "1" : "0");
}

export async function loadMeta(key: string): Promise<string | undefined> {
  const sql = await getSql();
  await ensureMeta(sql);
  const rows = await sql<{ value: string }>`
    select value from meta where key = ${key} limit 1
  `;
  return rows[0]?.value;
}

export async function saveMeta(key: string, value: string): Promise<void> {
  const sql = await getSql();
  await ensureMeta(sql);
  await sql.query(
    `insert into meta (key, value) values ($1, $2)
     on conflict (key) do update set value = excluded.value`,
    [key, value],
  );
}

export async function saveWallet(wallet: Wallet): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into wallets (id, name, balance, created_at)
     values ($1, $2, $3, $4)
     on conflict (id) do update set
       name = excluded.name,
       balance = excluded.balance`,
    [wallet.id, wallet.name, wallet.balance, wallet.createdAt],
  );
}

export async function saveMatch(match: Match): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into matches (id, game_id, status, created_at, updated_at, payload)
     values ($1, $2, $3, $4, $5, $6::jsonb)
     on conflict (id) do update set
       game_id = excluded.game_id,
       status = excluded.status,
       updated_at = excluded.updated_at,
       payload = excluded.payload`,
    [match.id, match.gameId, match.status, match.createdAt, Date.now(), JSON.stringify(match)],
  );
}

export async function saveLedger(entry: LedgerEntry): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into ledger (id, ts, from_id, to_id, amount, kind, match_id, note)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (id) do nothing`,
    [entry.id, entry.ts, entry.from, entry.to, entry.amount, entry.kind, entry.matchId ?? null, entry.note],
  );
}

export async function deleteMatch(id: string): Promise<void> {
  const sql = await getSql();
  await sql.query(`delete from matches where id = $1`, [id]);
}

export async function deleteWallet(id: string): Promise<void> {
  const sql = await getSql();
  await sql.query(`delete from wallets where id = $1`, [id]);
}
