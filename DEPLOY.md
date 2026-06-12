# Deploying GemStockKeep

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

### 4. Copy static assets into the standalone bundle

Next.js standalone does not include static files automatically:

```bash
cp -r .next/static   .next/standalone/.next/static
cp -r public         .next/standalone/public
```

### 5. Run the database migration

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
| `SMS_PROVIDER` | `textlk` (or `console` for test server) |
| `TEXTLK_API_TOKEN` | your Text.lk Bearer token |
| `TEXTLK_SENDER_ID` | `3logiq com` |
| `TEXTLK_API_URL` | `https://app.text.lk/api/v3/sms/send` |

> **Tip for test server:** set `SMS_PROVIDER=console` — OTPs print to the app log instead of sending SMS.

### 7. Configure the startup command

CloudPanel → **Sites** → your site → **Node.js** tab:

- **App Root:** `~/htdocs/gems.example.com/.next/standalone`
- **Start Command:** `node server.js`

Save, then click **Restart**.

### 8. Verify

- Visit `https://gems.example.com` — should redirect to `/login`
- Enter an admin phone from `ADMIN_NUMBERS`
- If `SMS_PROVIDER=console`, check the app log for the OTP (CloudPanel → Sites → your site → **Logs**)
- Login and add a test gem

### Subsequent deploys

```bash
cd ~/htdocs/gems.example.com
git pull
npm install          # only needed if package.json changed
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public       .next/standalone/public
```

Then CloudPanel → Sites → your site → **Restart**.

### CloudPanel troubleshooting

| Symptom | Fix |
|---|---|
| App won't start | Check Logs tab in CloudPanel. Usually a missing env var or wrong app root path. |
| Camera won't open | Requires HTTPS. CloudPanel auto-provisions Let's Encrypt — make sure it's active. |
| `ECONNREFUSED` on DB | Confirm `DATABASE_HOST=localhost` and the DB user has access from `127.0.0.1`. |
| QR resolves to "not from this system" | `QR_SECRET` changed. Regenerating invalidates all existing QR codes — keep it stable. |
| OTP not received | Set `SMS_PROVIDER=console` on test server and read from app logs. |
| Static assets 404 | Re-run the `cp -r .next/static` and `cp -r public` steps after every build. |

---

## Namecheap Shared Hosting (cPanel)

## Prerequisites

- cPanel with Node.js App support (Phusion Passenger)
- MySQL database created in cPanel → MySQL Databases
- Node 18+ available (check in cPanel → Setup Node.js App)
- SSL certificate active (required for camera scanning)

## 1. Build locally

```bash
npm run build
```

The output is in `.next/standalone/`. Verify it exists before uploading.

## 2. Run database migration

Run this against your production database **before** starting the app:

```bash
# Set prod env vars first, then:
npm run db:migrate
```

Or connect to the server via SSH and run it there.

## 3. Upload files to the server

Copy exactly these three items into your deployment directory (e.g. `/home/user/gemstockkeep/`):

```bash
# 1. Standalone bundle (includes node_modules for server deps)
cp -r .next/standalone/. /path/to/deploy/

# 2. Static assets — MUST be at this exact path
cp -r .next/static /path/to/deploy/.next/static

# 3. Public directory
cp -r public /path/to/deploy/public
```

The deploy directory must contain at minimum:
```
server.js          ← Passenger startup file
.next/static/
public/
node_modules/      ← bundled inside standalone
```

## 4. Set environment variables

In cPanel → Setup Node.js App → your app → Environment Variables, add:

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

## 5. Configure the cPanel Node.js App

1. cPanel → Setup Node.js App → Create Application
2. **Node.js version:** 18+ (pick the highest available)
3. **Application mode:** Production
4. **Application root:** `/home/user/gemstockkeep` (your deploy directory)
5. **Application URL:** your domain or subdomain
6. **Application startup file:** `server.js`
7. Click **Create** → then **Restart**

## 6. Verify

- Visit your domain — should redirect to `/login`
- Enter an admin phone number from `ADMIN_NUMBERS`
- Check Text.lk dashboard or server logs to confirm OTP delivery
- Login and add a test gem

## Troubleshooting

| Symptom | Fix |
|---|---|
| Camera won't open | Requires HTTPS. Activate SSL in cPanel → SSL/TLS. |
| App crashes on start | Check Passenger error log in cPanel → Logs. Usually missing env var. |
| "Too many connections" | Verify `connectionLimit: 5` in `lib/db.ts`. Restart Node app after deploys. |
| QR codes resolve to "not from this system" | `QR_SECRET` changed between builds. Regenerating it invalidates all existing QR codes. Keep it stable. |
| OTP not delivered | Confirm `TEXTLK_SENDER_ID` exactly matches your approved Text.lk sender mask. `3logiq com` must match exactly. |
| 500 on gem create | Run `npm run db:migrate` — tables may not exist yet. |

## Subsequent deploys

1. `npm run build` locally
2. Upload `.next/standalone/`, `.next/static/`, `public/` again (overwrite)
3. Restart the Node app in cPanel
4. No need to re-run migrations unless the schema changed
