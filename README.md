# Melanie Diaz — website + Salon OS

Two parts in one repo:

| Part | Where | What |
|---|---|---|
| Public website | repo root (`index.html`, `es/`, `links/`, `assets/`) | Static site on Cloudflare. Booking links go to **Goldie** (the live booking authority). |
| **Salon OS** | `salon-os/` | Private business system: client profiles, configurable intake, attribution, unified calendar, sandbox booking engine, owner dashboard. **Not deployed.** |

The living plan, decisions and open issues are in **[SALON_OS.md](SALON_OS.md)**.

## Salon OS — run locally

Requirements: Node.js ≥ 22.13 (uses built-in `node:sqlite`, `node:test`, `node:crypto`). **No npm dependencies.**

```bash
cd salon-os
npm test                      # 39 tests
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

## Architecture (short)
- **Three core records:** `clients`, `appointments`, `transactions`. Everything else references them (`salon-os/src/db/schema.sql`).
- **Fetch-style app** (`src/app.js`: Request → Response), thin Node adapter (`src/server.js`). Portable to Cloudflare Workers + D1 later.
- **Config, not code:** service catalog (`config/catalog.json`, mirrors Goldie), schedule (`config/schedule.json`), versioned intake forms (`config/forms/*.json`).
- **Shared intake engine** (`src/shared/intake-engine.js`) runs in both browser and server, so conditional logic and validation never disagree.
- **Providers:** booking (`goldie` = live, link-out; `native` = sandbox) and calendar (`google`) behind small interfaces.
