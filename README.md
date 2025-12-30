# Lead Generation Form for Hostinger

A simple Node.js lead capture form that sends notifications via Email, Discord, and Telegram.

## Features

- **Form Fields**: First Name, Last Name, Phone, Email, Zip Code, Filing Preference
- **Notifications**: Email (SMTP), Discord (Webhook), Telegram (Bot API)
- **Database**: MySQL (Hostinger included)
- **Security**: Rate limiting, input validation, helmet.js headers
- **Design**: Exact copy of TaxGeniusPro landing page
- **Preparer System**: 35 tax preparers with unique codes, auto-routing leads

## Tax Preparer System

Use `?ref=CODE` in the URL to display a specific tax preparer and route leads:

```
https://yourdomain.com/?ref=gw     # Gelisa White
https://yourdomain.com/?ref=rh     # Ray Hamilton
https://yourdomain.com/?ref=iw     # Ira Watkins
https://yourdomain.com/            # Default (Owliver Owl)
```

### How It Works
1. Visitor lands on `?ref=gw`
2. Page fetches preparer info via `/api/preparer/by-code?code=gw`
3. Preparer card shows Gelisa White's name and photo
4. Form submits with `refCode: gw`
5. Lead notification emails go to that preparer's email
6. Database stores which preparer generated the lead

## Quick Setup for Hostinger

### Step 1: Create MySQL Database

1. Log into Hostinger hPanel
2. Go to **Databases** → **MySQL Databases**
3. Create a new database and note:
   - Database name
   - Username
   - Password
4. Open **phpMyAdmin** and run `sql/schema.sql`

### Step 2: Configure Environment

1. Copy `.env.example` to `.env`
2. Fill in your database credentials
3. Configure notification settings (Email, Discord, Telegram)

### Step 3: Deploy to Hostinger

**Option A: GitHub Integration (Recommended)**
1. Push this code to a GitHub repository
2. In Hostinger hPanel → **Website** → **Node.js**
3. Click **Deploy from GitHub**
4. Select your repo and branch
5. Set environment variables in Hostinger
6. Deploy

**Option B: Upload via File Manager**
1. Zip the project folder (excluding node_modules)
2. Upload to Hostinger via File Manager
3. Extract in public_html or your app directory
4. Set environment variables in Hostinger Node.js settings

### Step 4: Test

1. Visit your domain
2. Submit a test form
3. Check:
   - MySQL database for saved lead
   - Email inbox for notification
   - Discord channel for message
   - Telegram for bot message

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `DB_HOST` | Yes | MySQL host (usually localhost) |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | Yes | MySQL database name |
| `SMTP_HOST` | Yes | SMTP server host |
| `SMTP_PORT` | Yes | SMTP port (587 or 465) |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASS` | Yes | SMTP password |
| `NOTIFICATION_EMAIL` | Yes | Where to send lead notifications |
| `DISCORD_WEBHOOK_URL` | No | Discord webhook URL |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token |
| `TELEGRAM_CHAT_ID` | No | Telegram chat ID |
| `ADMIN_API_KEY` | No | API key for viewing leads |

## API Endpoints

### Submit Lead
```
POST /api/leads
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "(555) 123-4567",
  "email": "john@example.com",
  "zipCode": "30301",
  "consent": true
}
```

### Get All Leads (Admin)
```
GET /api/leads
X-API-Key: your_admin_api_key
```

### Health Check
```
GET /health
```

### Get Preparer by Code
```
GET /api/preparer/by-code?code=gw
```
Returns preparer info (name, title, avatar) for displaying on the form.

### List All Preparers (Admin)
```
GET /api/preparer/all
X-API-Key: your_admin_api_key
```

## Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env

# Run locally
npm run dev

# Test at http://localhost:3000
```

## Notifications

### Email
Uses Nodemailer with SMTP. Recommended providers:
- **Postal** (self-hosted at postal.toolboxhosting.com)
- **Gmail** (use App Password)
- **SendGrid** (100 emails/day free)

### Discord
1. Create a webhook in your Discord server:
   - Server Settings → Integrations → Webhooks → New Webhook
2. Copy the webhook URL to `DISCORD_WEBHOOK_URL`

### Telegram
1. Create a bot via @BotFather on Telegram
2. Get your chat ID by messaging the bot and checking:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Add token and chat ID to environment variables

## Security

- Rate limited: 10 submissions per 15 minutes per IP
- Input validation with express-validator
- SQL injection prevention via parameterized queries
- XSS prevention via Helmet.js headers
- HTTPS provided by Hostinger

## Troubleshooting

**Form submission fails:**
- Check MySQL connection in Hostinger
- Verify database schema was created
- Check server logs in Hostinger

**Email not sending:**
- Verify SMTP credentials
- Check SMTP host/port settings
- Hostinger limits: 100 emails/day for script-based email

**Discord/Telegram not working:**
- Verify webhook URL / bot token
- Check if bot has permission to post
- Test manually with curl

## Support

For issues, contact: iradwatkins@gmail.com
