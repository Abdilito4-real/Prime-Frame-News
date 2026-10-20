# PrimeFrame

PrimeFrame uses Supabase for editor authentication, articles, newsletter subscriptions, and article image storage.

## Connect Supabase

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql).
3. In Authentication settings, disable public sign-ups. Create editor accounts yourself in **Authentication → Users**.
4. Add each authorized user's UUID to the editor allowlist:

   ```sql
   insert into public.editor_users (user_id)
   select id from auth.users where email = 'editor@example.com'
   on conflict (user_id) do nothing;
   ```

5. Copy `.env.example` to `.env.local` and fill in the project URL and the **publishable/anon key** from **Project Settings → API**:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   VITE_SITE_URL=https://www.primeframe.ng
   VITE_GA4_MEASUREMENT_ID=
   ```

6. Restart the Vite server with `npm run dev`.

## SEO and analytics

`VITE_SITE_URL` defaults to `https://www.primeframe.ng`; set it in the local environment and Vercel project settings only if the canonical domain changes. The sitemap and robots routes use this URL; submit `https://www.primeframe.ng/sitemap.xml` in Google Search Console after deployment.

The GA4 Measurement ID is `G-W3SJ3XQZZ4` and is configured in the app. If you need to change it, set `VITE_GA4_MEASUREMENT_ID` in the local environment and Vercel project settings. Google Analytics loads only after a visitor grants consent; visitors can reject or withdraw consent in the footer privacy settings.

## Supabase activity check

The GitHub Actions workflow in `.github/workflows/supabase-activity.yml` runs a small read-only query against the published articles API daily and can also be run manually. Add these repository secrets under **Settings → Secrets and variables → Actions** before enabling it:

- `SUPABASE_URL`: the Supabase project URL.
- `SUPABASE_ANON_KEY`: the public publishable/anon key (never use the `service_role` key).

This provides regular project activity but cannot guarantee that Supabase will never pause a project; provider limits and policies still apply. Consider a paid Supabase plan for production availability and backups.

The client uses only the public publishable/anon key. Never put a Supabase `service_role` key in a `VITE_` variable or in browser code. Database RLS policies restrict editorial changes to users in `public.editor_users`; public visitors can read published stories and submit newsletter emails. Subscriber addresses are not publicly readable.

The SQL setup creates the `articles` and `newsletter_subscribers` tables, editor allowlist/function, RLS policies, and the public-read/private-upload `article-images` storage bucket. Editors upload images from their device in the dashboard; objects are stored under their Supabase user ID.

The previous app stored articles and subscribers in each browser's local storage. That local data is not automatically copied into the new Supabase project; export and import it into `public.articles` if you need to preserve existing local-only stories.
