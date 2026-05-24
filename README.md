# Complex Law React Clone

A Vite/React recreation of https://www.complexlaw.co.uk generated from the public sitemap.

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

The build runs `npm run scrape` first, which refreshes `src/data/pages.generated.json` from the Complex Law sitemap before compiling the React app.

## Deployment

This repo is Vercel-ready:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

`vercel.json` rewrites all deep links back to `index.html` so client-side routes work after deployment.

## Secrets

No secrets are required for this React clone. Open Lovable, Firecrawl, AI, E2B, and Vercel Sandbox keys should stay in local `.env.local` files and must not be committed.
