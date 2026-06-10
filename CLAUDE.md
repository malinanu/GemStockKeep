# CLAUDE.md — Gem Stock & Custody System

> Project context for Claude Code. Read this fully before writing any code.
> Keep this file updated as the source of truth for architecture decisions.

---

## 1. What we're building

A stock-keeping web app for a gem dealer. The dealer **buys** loose gemstones from a
supplier vendor, then **hands them to other vendors to sell on consignment**. When handing
a stone over, the dealer quotes an **asking price** (e.g. Rs 10,000). The stone usually
sells a little **above or below** that quote, so the app must track **both** the price the
dealer asked for **and** the price it actually sold at — and surface the difference. Stones
get **sold**, or **returned** and re-handed to a different vendor (often at a new asking
price). The dealer needs to know, at any moment, **who is holding which stone**, **what
price was quoted**, and have a full history of every movement.

Each stone gets a printed **QR code**. Scanning it inside the app shows the stone's data
and current custody. Generic phone scanners must NOT be able to read the data.

This is a single-tenant internal tool for one business. Keep it simple and reliable over
clever. Mobile-first, because scanning and stock checks happen on a phone.

---

## 2. Tech stack & hard constraints

- **Framework:** Next.js (App Router, TypeScript).
- **DB:** MySQL (mysql2 driver, connection pool). Runs on the same Namecheap host.
- **Styling:** Tailwind CSS + shadcn/ui components. lucide-react for icons.
- **QR generate:** `qrcode` (server-side, produces SVG/PNG).
- **QR scan:** `html5-qrcode` or `@yudiel/react-qr-scanner` (browser camera).
- **Auth:** phone + OTP, session in a signed httpOnly cookie (jose / iron-session).
- **Validation:** zod on every API input.

### ⚠️ Hosting constraint: Namecheap shared hosting (cPanel)
This is the most important constraint. Design with it in mind:

- Next.js must run as a **cPanel Node.js App** (Phusion Passenger). Requires **Node 18+** —
  confirm the version available in cPanel before assuming features.
- Build with **`output: 'standalone'`** in `next.config.js`. Passenger's startup file
  points at the standalone `server.js`. `public/` and `.next/static` must be copied
  alongside it (document the exact copy steps in `DEPLOY.md`).
- **MySQL connection limits are low** on shared hosting (often ~25 total). Use a small pool
  (`connectionLimit: 5`) and a **global singleton** so dev hot-reload / Passenger workers
  don't open dozens of connections. Never create a pool per request.
- No long-running background jobs, no websockets. Everything is request/response.
- Camera scanning needs **HTTPS** — fine, Namecheap provides SSL, but it won't work over
  plain HTTP or raw IP.

If deployment proves too painful, the fallback is a small VPS, but assume Namecheap shared
hosting unless told otherwise.

---

## 3. Roles & auth

### Login flow (phone + OTP)
1. User enters phone number.
2. Backend checks the number is in the allow-list (`ADMIN_NUMBERS` or `USER_NUMBERS` in env).
   If not allowed, reject generically ("Number not authorised") — do not reveal which list.
3. Generate a 6-digit OTP, store a **hash** of it in the `otps` table with a TTL
   (default 5 min), and send it via **Text.lk** (`lib/sms.ts`, sender ID `3logiq com`).
4. User submits OTP → verify hash, not expired, not consumed, attempts < 5.
5. On success: issue a signed session cookie containing `{ phone, role }`. Mark OTP consumed.

### Roles
- **Role is derived from which env list the number is in.** `ADMIN_NUMBERS` → `admin`,
  `USER_NUMBERS` → `user`. (If a number is in both, admin wins.)
- **admin** can do everything: manage vendors, stone types, shapes, ID prefix, plus all
  stock operations.
- **user** can: view stock, scan QR, view custody logs. Cannot manage vendors/types/shapes/
  settings, cannot delete.
- **Switching is a toggle.** Put a visible **Admin ⇄ User toggle** in the app header /
  profile menu, shown **only to admins**. Flipping it switches the current view between the
  full Admin experience and the restricted User experience (admin-only nav items, action
  buttons, and management pages hide/show accordingly). Persist the choice in a `viewMode`
  cookie so it survives navigation/refresh.
- The toggle is **cosmetic and can only downgrade**. Authorisation is re-checked
  server-side from the **session role**, never from `viewMode`. A `user` account has no
  toggle and can never switch up to admin.

### Enforcement
- Guard every admin route/handler **server-side** by re-checking the session role. Never
  trust the client `viewMode` for authorisation — it's cosmetic only.

---

## 4. Data model (MySQL)

```sql
CREATE TABLE vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  notes TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stone_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shapes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- key/value config: id_prefix, id_sequence (last used number), etc.
CREATE TABLE settings (
  setting_key VARCHAR(64) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE gems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,          -- display ID, e.g. GEM-0001
  qr_token VARCHAR(64) NOT NULL UNIQUE,      -- opaque random id embedded (signed) in QR
  stone_type_id INT NOT NULL,
  weight DECIMAL(10,3) NOT NULL,             -- carats, 3 dp
  shape_id INT NOT NULL,
  purchasing_price DECIMAL(12,2) NOT NULL,   -- cost: what dealer paid Vendor 1
  bought_from_vendor_id INT NOT NULL,        -- "buy it from" (Vendor 1)
  current_vendor_id INT NULL,                -- holder for selling (Vendor 2); NULL = with dealer
  asking_price DECIMAL(12,2) NULL,           -- price dealer quoted to CURRENT holder; NULL when with dealer
  status ENUM('IN_STOCK','WITH_VENDOR','SOLD','RETURNED') NOT NULL DEFAULT 'IN_STOCK',
  sold_price DECIMAL(12,2) NULL,             -- actual final sale price (set on SOLD)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (stone_type_id) REFERENCES stone_types(id),
  FOREIGN KEY (shape_id) REFERENCES shapes(id),
  FOREIGN KEY (bought_from_vendor_id) REFERENCES vendors(id),
  FOREIGN KEY (current_vendor_id) REFERENCES vendors(id)
);

CREATE TABLE custody_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gem_id INT NOT NULL,
  action ENUM('CREATED','ASSIGNED','RETURNED','SOLD','REASSIGNED') NOT NULL,
  from_vendor_id INT NULL,
  to_vendor_id INT NULL,
  asking_price DECIMAL(12,2) NULL,           -- quoted price at this ASSIGNED/REASSIGNED event
  sold_price DECIMAL(12,2) NULL,             -- actual price at this SOLD event
  note VARCHAR(255),
  actor_phone VARCHAR(30),                   -- who performed the action
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gem_id) REFERENCES gems(id) ON DELETE CASCADE
);

CREATE TABLE otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(30) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  consumed TINYINT(1) NOT NULL DEFAULT 0,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone (phone)
);
```

Seed `settings` with `id_prefix = 'GEM'` and `id_sequence = 0`.
Provide a `schema.sql` and a `seed.sql`, plus a `npm run db:migrate` script that runs them.

> Stone types and shapes are **admin-managed lookup tables**, not free text. The add-gem
> form populates dropdowns from these tables.

---

## 5. Gem ID generation

- Format: `{prefix}-{zero-padded sequence}`, e.g. `GEM-0001`.
- On gem create, inside a **transaction**: read `id_sequence`, increment it, write it back,
  build `code` from `id_prefix` + the new number. This avoids race conditions / duplicate IDs.
- Admin can change `id_prefix` in Settings. Changing the prefix does NOT renumber existing
  stones — it only affects new ones.

---

## 6. QR codes — "only this system can read them"

**Goal:** a normal phone QR scanner must see meaningless text, not the gem data.

**Design:**
- The QR payload is **not** a URL and **not** the gem fields. It encodes a signed opaque
  token: `v1.{qr_token}.{sig}` where `sig = HMAC_SHA256(qr_token, QR_SECRET)` (base64url).
- `qr_token` is a random 24-char id generated at gem creation, stored in `gems.qr_token`.
- A generic scanner just sees something like `v1.aB3xK9pQ.../sQ2...` — useless to anyone.
- **Resolution is auth-gated:** the in-app scanner POSTs the scanned string to
  `POST /api/gems/resolve`. The handler:
  1. Requires a valid session.
  2. Parses the version prefix, recomputes the HMAC, rejects if signature invalid (tamper /
     foreign QR).
  3. Looks up the gem by `qr_token` and returns it.
- Never expose an endpoint that resolves a token **without** auth + signature check.

This gives you: unreadable-by-outsiders + tamper-proof + only-this-system-resolves. Keep
`QR_SECRET` server-side only; never ship it to the client bundle.

**Printing:** generate the QR as SVG/PNG on the gem detail page with a print-friendly label
(code, stone type, weight). Use the `qrcode` package server-side.

---

## 7. Custody state machine (the core domain logic)

A gem moves through these states. **Every transition writes a `custody_logs` row** and
updates `gems.status` / `gems.current_vendor_id` in the **same transaction**.

```
              ┌──────────── CREATE ────────────┐
              ▼                                 │
          IN_STOCK  ─ assign(vendor, ask) ─▶  WITH_VENDOR
              ▲                                 │
              │                                 ├── return() ──▶ IN_STOCK   (RETURNED log)
              │                                 │
              └──────────── (re-assignable) ◀───┘
                                                │
                                          reassign(newVendor, newAsk) ↺
                                                │
                                                └── sell(soldPrice) ──▶ SOLD   (terminal)
```

Transitions (server-enforced, reject invalid ones):

| Action   | Allowed from         | Result status | Log action | Sets on gem / captures                                  |
|----------|----------------------|---------------|------------|---------------------------------------------------------|
| create   | —                    | IN_STOCK      | CREATED    | purchasing_price, bought_from_vendor, current=NULL, asking=NULL |
| assign   | IN_STOCK             | WITH_VENDOR   | ASSIGNED   | current_vendor=toVendor, **asking_price=quote**; log.asking_price |
| return   | WITH_VENDOR          | IN_STOCK      | RETURNED   | from=current_vendor, current=NULL, **asking_price=NULL** |
| reassign | WITH_VENDOR          | WITH_VENDOR   | REASSIGNED | from=old, to=new, **asking_price=new quote**; log.asking_price |
| sell     | WITH_VENDOR/IN_STOCK | SOLD          | SOLD       | **sold_price=actual**, current frozen; log.sold_price   |

### Pricing rules (important)
- There are **three prices**: `purchasing_price` (cost from Vendor 1, fixed at creation),
  `asking_price` (what the dealer quotes the current holder — set on **assign/reassign**,
  required, can differ each time the stone goes out), and `sold_price` (actual sale amount,
  captured at **sell**).
- `assign` and `reassign` **require an asking price** input. Store it on both the gem
  (`gems.asking_price`, the current quote) and the log row (`custody_logs.asking_price`, the
  historical quote for that hand-off).
- `sell` **requires the actual sold price**. The stone may sell **above or below** the last
  asking price — both are valid; never clamp or reject based on the difference.
- Derived, computed on read (do not store): **sale variance = sold_price − asking_price**
  (positive = sold above quote, negative = below) and **profit = sold_price −
  purchasing_price**.

Notes:
- "Sometimes Vendor 2 returns it, then the dealer gives it to another vendor (at a new
  price)" = `return` then `assign`, OR a single `reassign` with the new asking price.
  Support both; `reassign` is the shortcut and carries the new quote.
- `SOLD` is terminal — no further transitions. Block re-selling a sold stone.
- Record `actor_phone` from the session on every log.

---

## 8. Routes & API

### Pages (App Router)
```
/login                      phone + OTP
/(app)/dashboard            stock summary, counts by status, recent activity
/(app)/gems                 list + filter (status, vendor, stone type, search by code)
/(app)/gems/new             add-gem form
/(app)/gems/[id]            detail: data, QR (print), custody timeline, action buttons
/(app)/scan                 camera scanner → resolves → redirects to detail
/(app)/vendors              admin only: list / add / edit / delete vendors
/(app)/settings             admin only: id prefix, stone types, shapes
```

### API route handlers
```
POST /api/auth/request-otp     { phone } -> sends OTP
POST /api/auth/verify-otp      { phone, code } -> sets session cookie
POST /api/auth/logout

GET  /api/gems                 list (with filters)
POST /api/gems                 create (admin) -> generates code + qr_token, CREATED log
GET  /api/gems/[id]
POST /api/gems/[id]/assign     { vendorId, askingPrice }    -- askingPrice required
POST /api/gems/[id]/return
POST /api/gems/[id]/reassign   { vendorId, askingPrice }    -- new quote required
POST /api/gems/[id]/sell       { soldPrice }                -- actual sale; may differ from asking
DELETE /api/gems/[id]          (admin)
POST /api/gems/resolve         { qr } -> verify HMAC + auth, return gem  [scanner]

GET/POST/PUT/DELETE /api/vendors          (admin for writes)
GET/POST/DELETE     /api/stone-types      (admin for writes)
GET/POST/DELETE     /api/shapes           (admin for writes)
GET/PUT             /api/settings         (admin for writes)
```

Every write handler: validate with zod → check session role → run inside a DB transaction →
write custody log where relevant.

---

## 9. UI / UX direction ("pro max")

Mobile-first, clean, fast. The dealer uses this on a phone in a shop, often one-handed.

**Aesthetic**
- Calm neutral surfaces (near-white / soft slate in light, deep charcoal in dark) with a
  single jewel accent — a deep emerald or sapphire — used sparingly for primary actions.
- Generous spacing, large tap targets (min 44px), rounded-2xl cards, subtle shadows, no
  visual clutter. Support light + dark mode.
- Typography: one clean sans (e.g. Inter). Weights for hierarchy, not many sizes.

**Key screens**
- **Dashboard:** status tiles (In stock / With vendor / Sold counts), a prominent
  **Scan** button, and recent custody activity.
- **Gem card:** code, stone type + shape, weight (ct), a **status badge** (colour-coded:
  in-stock=slate, with-vendor=amber, sold=emerald, returned=blue), current holder, and the
  current **asking price** when the stone is out with a vendor.
- **Gem detail:** big QR with a one-tap **Print label**, the data block, and a small
  **pricing summary** — Cost (purchasing), Asking (current quote), Sold (if sold), plus the
  two derived figures **Variance vs asking** and **Profit vs cost**, with colour cues
  (above-asking / profit = emerald, below-asking / loss = rose). Below that, action buttons
  (Assign / Return / Reassign / Sell) shown only when valid for the current status, and a
  **custody timeline at the bottom** — a vertical list, newest first, each entry showing
  action, from → to vendor, the **price attached to that event** (asking price for
  assign/reassign, sold price + variance for sell), who did it, and timestamp. This timeline
  is the headline feature; make it readable and skimmable.
- **Assign / Reassign dialog:** vendor dropdown **+ a required asking-price field** (Rs).
- **Sell dialog:** an actual-sold-price field (Rs); show the current asking price beside it
  and live-calculate the difference ("Rs 1,500 above asking" / "Rs 800 below asking") so the
  dealer sees the variance before confirming. Never block a below-asking sale.
- **Scanner:** full-screen camera, clear framing guide, instant feedback on scan, graceful
  error if the QR isn't one of ours ("This QR isn't from this system").
- **Forms:** dropdowns for stone type / shape / vendor (from lookup tables), inline
  validation, optimistic-feeling but safe submits. Show all money as `Rs` (LKR).

**States:** always design empty states (no gems yet), loading skeletons, and error toasts.
Use shadcn/ui primitives (Button, Card, Dialog, Select, Badge, Table, Sonner toasts).

---

## 10. Environment variables

```env
# Database (Namecheap MySQL)
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=

# Security
SESSION_SECRET=          # long random string, signs the session cookie
QR_SECRET=               # long random string, HMAC key for QR tokens (server-only)

# Auth allow-list (comma-separated, full international format)
ADMIN_NUMBERS=+9477xxxxxxx
USER_NUMBERS=+9476xxxxxxx,+9471xxxxxxx

# OTP
OTP_TTL_SECONDS=300
OTP_LENGTH=6

# SMS provider: textlk (production) | console (dev only)
SMS_PROVIDER=textlk
TEXTLK_API_TOKEN=                 # Bearer token from Text.lk dashboard (server-only)
TEXTLK_SENDER_ID=3logiq com       # approved Text.lk sender ID — must match exactly
TEXTLK_API_URL=https://app.text.lk/api/v3/sms/send
```

- `SMS_PROVIDER=console` logs the OTP to the server console for **local dev only** — never
  use in prod. Production uses **Text.lk**.
- Wrap SMS behind a single `lib/sms.ts` interface `sendSms(phone, message)` with one adapter
  per provider, selected by `SMS_PROVIDER`. Only `textlk` and `console` are needed.
- **Text.lk adapter spec:** `POST` to `TEXTLK_API_URL` with headers
  `Authorization: Bearer ${TEXTLK_API_TOKEN}`, `Content-Type: application/json`,
  `Accept: application/json`, and JSON body
  `{ recipient, sender_id: TEXTLK_SENDER_ID, type: "plain", message }`.
  A successful response is `{ "status": "success", ... }`; treat `{ "status": "error" }`
  (or any non-2xx) as a send failure and surface a generic "couldn't send OTP" error.
- **Phone format:** Text.lk expects local format **without `+`**, e.g. `94771234567`. The
  allow-list stores `+94...`; the adapter must **strip the leading `+`** before sending.
  Keep the canonical `+94...` form everywhere else (session, allow-list checks).
- The sender ID `3logiq com` must be the one approved in the Text.lk dashboard — Text.lk
  rejects/loses messages sent with an unapproved mask, and `TextLKDemo` is test-only and not
  allowed for OTP.
- **Never** import `QR_SECRET`, `SESSION_SECRET`, `TEXTLK_API_TOKEN`, or DB creds into client
  components.

---

## 11. Project structure

```
/app                  routes (see §8)
/lib
  db.ts               mysql2 pool singleton (global to survive hot reload)
  auth.ts             session create/verify, role guards, getSession()
  qr.ts               signToken / verifyToken / generateQrSvg
  sms.ts              sendSms() + provider adapters
  ids.ts              next gem code (transactional)
  custody.ts          transition functions (assign/return/reassign/sell) + logging
  validators.ts       zod schemas
/components           ui (shadcn) + domain components (GemCard, CustodyTimeline, ...)
/db
  schema.sql
  seed.sql
schema/migrate script
DEPLOY.md             Namecheap cPanel Node app steps
```

---

## 12. Conventions & guardrails

- **TypeScript strict.** No `any` on domain types.
- **All money** in `DECIMAL`, handled as strings/numbers carefully — never float-add prices.
  Currency is **LKR**, displayed as `Rs`.
- **Three distinct prices** per gem — `purchasing_price` (cost), `asking_price` (current
  quote to holder), `sold_price` (actual sale). `asking_price` is also logged per hand-off.
  Variance (`sold − asking`) and profit (`sold − cost`) are **computed on read**, may be
  negative, and are never used to validate/reject a sale.
- **Weight** in carats, 3 decimal places.
- **All mutations are transactional** and write custody logs atomically with the state change.
- **Authorisation is always server-side.** `viewMode` is cosmetic only.
- **One DB pool**, `connectionLimit: 5`, released in `finally`. No connection leaks.
- Validate every input with zod; reject early.
- Don't log OTP codes or secrets in production.
- Keep handlers thin; put domain logic in `/lib`.

---

## 13. Build order (suggested)

1. DB schema + seed + `lib/db.ts` pool singleton.
2. Auth: OTP request/verify, session cookie, role guards, `console` SMS adapter.
3. Admin lookups: vendors, stone types, shapes, settings (prefix).
4. Gems: create (code + qr_token generation), list, detail.
5. QR: sign/verify, render, print label, scanner page + `/resolve`.
6. Custody transitions + timeline UI.
7. Dashboard + filters.
8. Polish: dark mode, empty/loading/error states, `viewMode` toggle.
9. `output: 'standalone'`, `DEPLOY.md`, test on the cPanel Node app.

---

## 14. Open questions to confirm with the client

- Should `sold` stones stay visible in the main list or move to an archive/history view?
- Where should aggregate profit/variance reporting live (e.g. a totals row on the dashboard:
  total cost, total sold, total profit, count sold above vs below asking)? Per-stone figures
  are already covered.
- Whether a stone can be edited after creation, or is locked once it has custody history.
- Can the dealer **re-quote** the asking price to the *same* vendor without a return (i.e. a
  price-update event), or does changing the quote always go through reassign? (Assumed: same
  vendor keeps one quote; changing vendor or returning resets it.)