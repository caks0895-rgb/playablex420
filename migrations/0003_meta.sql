-- Floor flags (unowned). house_bots defaults on.
create table if not exists meta (
  key   text primary key,
  value text not null
);
