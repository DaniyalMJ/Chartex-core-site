# Deploying ChartEx Core to Vercel

## Option A — Vercel CLI (fastest, ~2 minutes)
```
npm install -g vercel
cd chartex-core-site
vercel
```
Follow the prompts (log in, confirm project name, accept defaults — Vercel auto-detects Vite). It'll give you a live URL immediately.

## Option B — GitHub + Vercel dashboard (matches how chartexprime.vercel.app was likely set up)
1. Push this folder to a new GitHub repo
2. Go to vercel.com → Add New Project → Import your repo
3. Framework Preset: Vite (should auto-detect)
4. Build Command: `npm run build` (default, no change needed)
5. Output Directory: `dist` (default, no change needed)
6. Deploy

## Option C — Drag and drop (no CLI, no GitHub)
1. Run `npm run build` locally — creates a `dist/` folder
2. Go to vercel.com → Add New Project → drag the `dist/` folder onto the page
3. Done — this deploys the static build directly

Any of these gets you a live URL like `chartex-core.vercel.app` you can point a custom domain at later if you want.
