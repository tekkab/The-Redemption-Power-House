# The Redemption Power House

Public church notice board with a private administrator sign-in, powered by React, Vite and Supabase.

## Local development

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add the Supabase project URL and publishable key.
5. Run `npm run dev`.

## Supabase setup

Run the SQL in `supabase/schema.sql` in the Supabase SQL Editor. The first administrator account is bootstrapped after the invited admin signs in; see the SQL file for the secure setup steps.

Never put a Supabase secret/service-role key in frontend environment variables.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and deploys the static frontend. Add repository Actions variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then enable GitHub Pages with **GitHub Actions** as the source in repository Settings → Pages.

## Project status

Initial frontend scaffold. Live content, admin authorisation and publishing become active after Supabase is configured and the schema is installed.