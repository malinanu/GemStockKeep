# Deploying GemStockKeep to Namecheap Shared Hosting (cPanel)

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
