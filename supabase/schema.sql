create table if not exists public.articles (
  id text primary key,
  title text not null,
  slug text not null unique,
  subtitle text not null default '',
  category text not null,
  category_slug text not null,
  author text not null default '',
  author_slug text not null default '',
  excerpt text not null default '',
  image text not null default '',
  body text[] not null default '{}',
  tags text[] not null default '{}',
  read_time integer not null default 1 check (read_time > 0),
  views bigint not null default 0 check (views >= 0),
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'scheduled', 'published', 'archived')),
  featured boolean not null default false,
  trending boolean not null default false,
  editor_pick boolean not null default false,
  breaking boolean not null default false,
  comments_enabled boolean not null default true
);

create index if not exists articles_published_at_idx
  on public.articles (published_at desc)
  where status = 'published';
create index if not exists articles_category_slug_idx
  on public.articles (category_slug);

update public.articles
set category = 'Editorial',
    category_slug = 'editorial',
    updated_at = now()
where lower(trim(category_slug)) = 'health'
   or lower(trim(category)) = 'health';

create table if not exists public.editor_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.editor_users enable row level security;

drop policy if exists "Editors can view their own access" on public.editor_users;
create policy "Editors can view their own access"
  on public.editor_users for select to authenticated
  using (user_id = auth.uid());

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.editor_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to authenticated;

alter table public.articles enable row level security;

drop policy if exists "Published stories are readable by everyone" on public.articles;
create policy "Published stories are readable by everyone"
  on public.articles for select
  using (status = 'published');

drop policy if exists "Authenticated editors can read all stories" on public.articles;
create policy "Authenticated editors can read all stories"
  on public.articles for select to authenticated
  using (public.is_editor());

drop policy if exists "Authenticated editors can create stories" on public.articles;
create policy "Authenticated editors can create stories"
  on public.articles for insert to authenticated
  with check (public.is_editor());

drop policy if exists "Authenticated editors can update stories" on public.articles;
create policy "Authenticated editors can update stories"
  on public.articles for update to authenticated
  using (public.is_editor()) with check (public.is_editor());

drop policy if exists "Authenticated editors can delete stories" on public.articles;
create policy "Authenticated editors can delete stories"
  on public.articles for delete to authenticated
  using (public.is_editor());

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email))),
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Anyone can subscribe to the newsletter" on public.newsletter_subscribers;
create policy "Anyone can subscribe to the newsletter"
  on public.newsletter_subscribers for insert to anon, authenticated
  with check (true);

drop policy if exists "Authenticated editors can count subscribers" on public.newsletter_subscribers;
create policy "Authenticated editors can count subscribers"
  on public.newsletter_subscribers for select to authenticated
  using (public.is_editor());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-images',
  'article-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Article images are publicly readable" on storage.objects;
create policy "Article images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'article-images');

drop policy if exists "Authenticated editors can upload article images" on storage.objects;
create policy "Authenticated editors can upload article images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'article-images'
    and public.is_editor()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated editors can update their article images" on storage.objects;
create policy "Authenticated editors can update their article images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'article-images'
    and public.is_editor()
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'article-images'
    and public.is_editor()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated editors can delete their article images" on storage.objects;
create policy "Authenticated editors can delete their article images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'article-images'
    and public.is_editor()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
