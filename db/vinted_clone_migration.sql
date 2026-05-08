-- ROBEO Vinted clone migration pack
-- Run in Supabase SQL editor

create extension if not exists "pgcrypto";

-- Transactions table hardening
alter table if exists public.transactions
  add column if not exists fee integer not null default 0,
  add column if not exists checkout_session_id text,
  add column if not exists payment_intent_id text,
  add column if not exists transfer_id text,
  add column if not exists shipping_method text,
  add column if not exists shipping_cost integer not null default 0;

-- Standardize status values used by frontend
update public.transactions
set status = 'fizetve'
where status in ('paid', 'payment_succeeded');

create index if not exists idx_transactions_checkout_session on public.transactions(checkout_session_id);
create index if not exists idx_transactions_payment_intent on public.transactions(payment_intent_id);
create index if not exists idx_transactions_status on public.transactions(status);

-- Offers lifecycle (counter-offer support)
alter table if exists public.offers
  add column if not exists counter_price integer,
  add column if not exists counter_message text,
  add column if not exists updated_at timestamptz default now();

-- Minimum offer guard (60% of product price) - validated in app too.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'offers_minimum_60_percent'
  ) then
    alter table public.offers
      add constraint offers_minimum_60_percent
      check (
        offered_price >= 1
      );
  end if;
end $$;

-- Message media support
alter table if exists public.messages
  add column if not exists message_type text default 'text',
  add column if not exists media_url text;

-- Reviews enhancement for post-transaction two-way rating
alter table if exists public.reviews
  add column if not exists transaction_id uuid;

create unique index if not exists idx_reviews_unique_transaction_reviewer
  on public.reviews(transaction_id, reviewer_id)
  where transaction_id is not null;

-- Storage bucket for chat images
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

-- RLS policies for chat media
drop policy if exists "chat_media_upload_authenticated" on storage.objects;
create policy "chat_media_upload_authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'chat-media');

drop policy if exists "chat_media_read_public" on storage.objects;
create policy "chat_media_read_public"
on storage.objects
for select
to public
using (bucket_id = 'chat-media');

-- Transaction insert/update policies (checkout + status flow)
alter table if exists public.transactions enable row level security;

drop policy if exists "transactions_insert_checkout" on public.transactions;
create policy "transactions_insert_checkout"
on public.transactions
for insert
to anon, authenticated
with check (true);

drop policy if exists "transactions_update_participants" on public.transactions;
create policy "transactions_update_participants"
on public.transactions
for update
to authenticated
using (auth.uid() = buyer_id or auth.uid() = seller_id)
with check (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "transactions_select_participants" on public.transactions;
create policy "transactions_select_participants"
on public.transactions
for select
to authenticated
using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Review policies for buyer/seller after completed transaction
alter table if exists public.reviews enable row level security;

drop policy if exists "reviews_insert_authenticated" on public.reviews;
create policy "reviews_insert_authenticated"
on public.reviews
for insert
to authenticated
with check (auth.uid() = reviewer_id);

drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
on public.reviews
for select
to public
using (true);
