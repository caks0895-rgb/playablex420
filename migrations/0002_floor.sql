-- Durable floor: wallets, matches, ledger. Unowned (no user_id) — world-readable.
create table if not exists wallets (
  id         text primary key,
  name       text not null,
  balance    integer not null,
  created_at bigint not null
);

create table if not exists matches (
  id         text primary key,
  game_id    text not null,
  status     text not null,
  created_at bigint not null,
  updated_at bigint not null,
  payload    jsonb not null
);

create index if not exists matches_status_idx on matches (status);
create index if not exists matches_created_idx on matches (created_at desc);

create table if not exists ledger (
  id       text primary key,
  ts       bigint not null,
  from_id  text not null,
  to_id    text not null,
  amount   integer not null,
  kind     text not null,
  match_id text,
  note     text not null
);

create index if not exists ledger_ts_idx on ledger (ts desc);
