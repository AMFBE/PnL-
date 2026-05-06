# Trading Journal

P&L Calendar mit Liquid Glass Design, Supabase Auth & Cloud-Sync.

## Setup

### 1. Supabase Datenbank einrichten

Gehe in deinem Supabase-Projekt zu **SQL Editor → New query** und führe folgendes aus:

```sql
create table pnl_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date_key text not null,
  pnl numeric,
  adherence boolean,
  updated_at timestamptz default now(),
  unique(user_id, date_key)
);

alter table pnl_entries enable row level security;

create policy "Users see own data" on pnl_entries
  for all using (auth.uid() = user_id);
```

### 2. Lokal starten

```bash
npm install
npm run dev
```

### 3. Auf Vercel deployen

1. Dieses Repo auf GitHub pushen
2. Auf vercel.com → "New Project" → GitHub Repo auswählen
3. Deploy klicken — fertig!

## Tech Stack

- React 18 + Vite
- Framer Motion (Animationen)
- Supabase (Auth + Datenbank)
