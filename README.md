# Melanie Diaz — website + Salon OS

Two parts in one repo:

| Part | Where | What |
|---|---|---|
| Public website | repo root (`index.html`, `es/`, `links/`, `assets/`) | Static site on Cloudflare. Booking links go to **Goldie** (the live booking authority). |
| **Salon OS** | `salon-os/` | Private business system: client profiles, configurable intake, attribution, unified calendar, sandbox booking engine, owner dashboard. **Not deployed.** |

The living plan, decisions and open issues are in **[SALON_OS.md](SALON_OS.md)**.

## Salon OS — run locally

Requirements: Node.js ≥ 22.13 (uses built-in `node:sqlite`, `node:test`, `node:crypto`). No runtime dependencies; `wrangler` (dev only) builds and deploys to Cloudflare.

```bash
cd salon-os
npm install                   # dev tool only (wrangler)
npm test                      # 41 tests
SALON_OS_OWNER_EMAIL=you@example.com SALON_OS_OWNER_PASSWORD='a long passphrase' npm run create-owner
npm start                     # http://127.0.0.1:8787
```

- `http://127.0.0.1:8787/book/` — client booking journey (new/returning → service → intake → hand-off to Goldie)
- `http://127.0.0.1:8787/admin/` — owner dashboard

Locally, a dev encryption key is generated in `salon-os/data/` if `SALON_OS_DATA_KEY` isn't set. Everything in `salon-os/data/` (database, encrypted photos, keys) is gitignored.

### Environment
| Variable | Required | Purpose |
|---|---|---|
| `SALON_OS_DATA_KEY` | production | 32-byte base64 key; encrypts intake answers, notes, formulas, photos, OAuth tokens. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. **Back it up — data is unreadable without it.** |
| `SALON_OS_DB` | no | SQLite path (default `salon-os/data/salon-os.db`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | for calendar | Google OAuth client (Calendar API enabled). Redirect: `https://<host>/api/admin/oauth/google/callback` |
| `NODE_ENV=production` | production | Secure cookies; refuses to start without a data key |
| `SETUP_TOKEN` | first deploy only | Allows creating the owner once via the dashboard's *First-time setup*; delete afterwards |
| `PUBLIC_INTAKE=off` | production default | Disables client intake submissions until the form is approved |

Local Cloudflare runtime: put secrets in `salon-os/.dev.vars` (gitignored), then `npx wrangler dev`. Deployment steps: **[SALON_OS.md → Deploy runbook](SALON_OS.md#deploy-runbook-cloudflare--you-run-these-nothing-here-touches-melanie-diazcom)**.

## Architecture (short)
- **Three core records:** `clients`, `appointments`, `transactions`. Everything else references them (`salon-os/src/db/schema.js`).
- **Fetch-style app** (`src/app.js`) with two thin hosts: Node (`src/server.js`, local) and Cloudflare (`src/worker.js`: Worker + one Durable Object holding the SQLite database, R2 for photos, Static Assets for pages).
- **Config, not code:** service catalog (`config/catalog.json`, mirrors Goldie), schedule (`config/schedule.json`), versioned intake forms (`config/forms/*.json`).
- **Shared intake engine** (`src/shared/intake-engine.js`) runs in both browser and server, so conditional logic and validation never disagree.
- **Providers:** booking (`goldie` = live, link-out; `native` = sandbox) and calendar (`google`) behind small interfaces.
