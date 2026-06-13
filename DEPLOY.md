# Deploying GemStockKeep

## Production environment checklist

The app validates its environment at startup (`lib/env.ts`) and **refuses to serve** with a clear error in the logs if anything below is misconfigured:

- Required everywhere: `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `SESSION_SECRET`, `QR_SECRET`, `ADMIN_NUMBERS`
- Required when `NODE_ENV=production`: **`SMS_PROVIDER=textlk`**, `TEXTLK_API_TOKEN`, `TEXTLK_SENDER_ID`, `TEXTLK_API_URL`

**`SMS_PROVIDER=textlk` is the one that silently breaks OTP delivery if forgotten** — the `console` adapter logs OTPs to the server console instead of sending SMS, while the login screen still reports success. The startup validation now blocks this in production, but a server with `SMS_PROVIDER=console` (e.g. a test VPS) will never deliver real SMS by design.

OTP requests are rate-limited to **3 per phone per 10 minutes** (HTTP 429 beyond that), and requesting a new code invalidates any previous unconsumed one.

---

## CloudPanel (VPS / Test Server)

CloudPanel manages Nginx + systemd for Node.js apps. These steps assume you have root or SSH access.

### 1. Create the Node.js site in CloudPanel UI

1. CloudPanel → **Sites** → **Add Site** → choose **Node.js**
2. Fill in:
   - **Domain Name:** e.g. `gems.example.com`
   - **Node.js Version:** 18 (or 20 if available)
   - **App Port:** `3000`
   - **Site User / Password:** set a strong password
3. Click **Add Site** — CloudPanel creates the site directory and Nginx reverse-proxy config automatically.

### 2. SSH into the server and clone the repo

```bash
ssh root@YOUR_SERVER_IP
# switch to the site user
su - SITE_USER

cd ~/htdocs/gems.example.com   # CloudPanel site root

git clone https://github.com/malinanu/GemStockKeep.git .
```

For subsequent deploys just `git pull`.

### 3. Install dependencies and build

```bash
npm install
npm run build
```

### 4. Run the database migration

On first deploy (or when schema changes), run this against your MySQL database:

```bash
# Set env vars inline or via the .env file described below
DATABASE_HOST=localhost \
DATABASE_PORT=3306 \
DATABASE_USER=db_user \
DATABASE_PASSWORD=db_pass \
DATABASE_NAME=db_name \
npx tsx db/migrate.ts
```

### 6. Set environment variables in CloudPanel

CloudPanel → **Sites** → your site → **Node.js** tab → **Environment Variables**

Add every variable from the table below. The standalone `server.js` reads from the process environment at runtime — **do not rely on a `.env` file** in production.

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_HOST` | `localhost` |
| `DATABASE_PORT` | `3306` |
| `DATABASE_USER` | your DB username |
| `DATABASE_PASSWORD` | your DB password |
| `DATABASE_NAME` | your DB name |
| `SESSION_SECRET` | long random string (32+ chars) |
| `QR_SECRET` | another long random string (32+ chars) |
| `ADMIN_NUMBERS` | `+9477xxxxxxx` |
| `USER_NUMBERS` | `+9476xxxxxxx,+9471xxxxxxx` |
| `OTP_TTL_SECONDS` | `300` |
| `OTP_LENGTH` | `6` |
| `SMS_PROVIDER` | `textlk` |
| `TEXTLK_API_TOKEN` | your Text.lk Bearer token |
| `TEXTLK_SENDER_ID` | `3logiq com` |
| `TEXTLK_API_URL` | `https://app.text.lk/api/v3/sms/send` |

> **Note:** with `NODE_ENV=production` the app refuses to start unless `SMS_PROVIDER=textlk` and the `TEXTLK_*` vars are set (see checklist at the top). The `console` adapter is for local `npm run dev` only.

### 7. Configure the startup command

CloudPanel → **Sites** → your site → **Node.js** tab:

- **App Root:** `~/htdocs/gems.example.com` (the project root, where `server.js` lives)
- **Start Command:** `node server.js`

Save, then click **Restart**.

### 8. Verify

- Visit `https://gems.example.com` — should redirect to `/login`
- Enter an admin phone from `ADMIN_NUMBERS` — the OTP should arrive by SMS
- If it doesn't, check the app log (CloudPanel → Sites → your site → **Logs**) for `[request-otp] SMS send failed` — the Text.lk error detail is logged there
- Login and add a test gem

### Subsequent deploys

```bash
cd ~/htdocs/gems.example.com
git pull
npm install          # only needed if package.json changed
npm run build
```

Then CloudPanel → Sites → your site → **Restart**.

### CloudPanel troubleshooting

| Symptom | Fix |
|---|---|
| App won't start | Check Logs tab in CloudPanel. Usually a missing env var or wrong app root path. |
| Camera won't open | Requires HTTPS. CloudPanel auto-provisions Let's Encrypt — make sure it's active. |
| `ECONNREFUSED` on DB | Confirm `DATABASE_HOST=localhost` and the DB user has access from `127.0.0.1`. |
| QR resolves to "not from this system" | `QR_SECRET` changed. Regenerating invalidates all existing QR codes — keep it stable. |
| OTP not received | Check app logs for `[request-otp] SMS send failed` — includes the Text.lk response. Also confirm the request didn't hit the 429 rate limit (3 per 10 min). |
| Static assets 404 | Re-run `npm run build` and restart. Ensure `.next/static/` is present in the project root. |

---

## Namecheap Shared Hosting (cPanel)

### Prerequisites

- cPanel with **Setup Node.js App** (Phusion Passenger)
- MySQL database created in cPanel → MySQL Databases
- Node 18+ available (check in cPanel → Setup Node.js App)
- SSL certificate active (required for camera scanning)

### How it works

Phusion Passenger runs `server.js` at the application root as the startup file. The app reads `PORT` from Passenger's environment and starts the Next.js request handler. No standalone bundle — just the source, the `.next/` build output, and the installed `node_modules/`.

### 1. Build locally

```bash
npm run build
```

Verify `.next/` exists. There is no `standalone/` subdirectory — that mode is disabled.

### 2. Run the database migration

Run against your production database before the first deploy (or after schema changes):

```bash
# Set prod env vars, then:
npm run db:migrate
```

Or SSH into the server and run it there after Step 4.

### 3. Upload files to the server

Upload the following into your application root (e.g. `/home/user/gemstockkeep/`). **Do not upload `node_modules/`** — cPanel installs them in Step 4.

```
app/
components/
db/
lib/
public/
types/
.next/               ← full build output
server.js            ← Passenger startup file
next.config.js
package.json
package-lock.json
postcss.config.mjs
tailwind.config.ts
tsconfig.json
```

Easiest method: zip locally, upload via cPanel File Manager, extract on the server.

```bash
# Create the zip (run from the project root):
zip -r deploy.zip app components db lib public types .next \
    server.js next.config.js package.json package-lock.json \
    postcss.config.mjs tailwind.config.ts tsconfig.json \
    --exclude "*.env*" --exclude "*/.git/*"
```

Then cPanel → File Manager: upload `deploy.zip` to the app root and extract.

### 4. Install dependencies on the server

cPanel → **Setup Node.js App** → your app → click **Run NPM Install**.

This installs all packages listed in `package.json` into `node_modules/` on the server. Only repeat this when `package.json` changes.

### 5. Configure the cPanel Node.js App

1. cPanel → **Setup Node.js App** → **Create Application** (or edit existing)
2. **Node.js version:** 18+ (pick the highest available)
3. **Application mode:** Production
4. **Application root:** `/home/user/gemstockkeep` (the directory containing `server.js`)
5. **Application URL:** your domain or subdomain
6. **Application startup file:** `server.js`
7. Click **Create** (or **Save**) → then **Restart**

### 6. Set environment variables

cPanel → Setup Node.js App → your app → **Environment Variables**:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_HOST` | `localhost` |
| `DATABASE_PORT` | `3306` |
| `DATABASE_USER` | your cPanel DB username |
| `DATABASE_PASSWORD` | your DB password |
| `DATABASE_NAME` | your DB name |
| `SESSION_SECRET` | long random string (32+ chars) |
| `QR_SECRET` | another long random string (32+ chars) |
| `ADMIN_NUMBERS` | `+9477xxxxxxx` (comma-separated for multiple) |
| `USER_NUMBERS` | `+9476xxxxxxx,+9471xxxxxxx` |
| `OTP_TTL_SECONDS` | `300` |
| `OTP_LENGTH` | `6` |
| `SMS_PROVIDER` | `textlk` |
| `TEXTLK_API_TOKEN` | your Text.lk Bearer token |
| `TEXTLK_SENDER_ID` | `3logiq com` |
| `TEXTLK_API_URL` | `https://app.text.lk/api/v3/sms/send` |

Restart the app after saving env vars.

### 7. Verify

- Visit your domain — should redirect to `/login`
- Enter an admin phone number from `ADMIN_NUMBERS`
- OTP should arrive by SMS; login and add a test gem

### Subsequent deploys

1. Build locally: `npm run build`
2. Re-upload `.next/` (and any changed source files)
3. If `package.json` changed: click **Run NPM Install** in cPanel
4. Restart the app in cPanel → Setup Node.js App

### Troubleshooting

| Symptom | Fix |
|---|---|
| App won't start | Check Passenger error log: cPanel → Logs → Node.js Logs. Usually a missing env var or Node version too old. |
| Camera won't open | Requires HTTPS. Activate SSL in cPanel → SSL/TLS. |
| `Error: Cannot find module 'next'` | Run NPM Install in cPanel → Setup Node.js App. |
| "Too many connections" DB error | Verify `connectionLimit: 5` in `lib/db.ts`. Restart the Node app after deploys. |
| QR codes "not from this system" | `QR_SECRET` changed. Keep it stable — regenerating invalidates all existing QR codes. |
| OTP not delivered | Confirm `TEXTLK_SENDER_ID` exactly matches your approved Text.lk sender mask. Check logs for `[request-otp] SMS send failed`. |
| 500 on gem create | Run `npm run db:migrate` — tables may not exist yet. |
| Static assets not loading | Ensure `.next/` was fully uploaded, including `.next/static/`. |
