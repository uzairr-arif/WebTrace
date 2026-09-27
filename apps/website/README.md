# webtrace.dev — project website

The WebTrace landing page. Pure static HTML + CSS (no build step) so it can
deploy anywhere.

## Local preview

```bash
npx serve apps/website
# or: python -m http.server -d apps/website 8000
```

## Deploy (GitHub Pages)

The site is fully self-contained (`index.html` + `assets/`). Easiest options:

1. **Pages from folder:** Settings → Pages → deploy from branch, root
   `/apps/website` (via an action or a `gh-pages` branch).
2. **Any static host:** upload this folder (Netlify, Vercel, Cloudflare
   Pages).

`.nojekyll` is included so GitHub Pages serves files as-is.

## Updating screenshots

The screenshots in `assets/` come from the running product:

```bash
node tests/e2e/screenshot.mjs   # writes docs/screenshots/, then copy over
cp docs/screenshots/*.png apps/website/assets/
```
