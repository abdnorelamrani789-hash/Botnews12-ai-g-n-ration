# 🤖 Autonomous Arabic News Bot — Web Edition

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-Flash-orange?style=for-the-badge&logo=google&logoColor=white)
![Facebook](https://img.shields.io/badge/Facebook-Graph_API-1877F2?style=for-the-badge&logo=facebook&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-SPA_Dashboard-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

**A full-stack autonomous news bot built with TypeScript & Express. Fetches breaking Arabic news, analyzes it with Google Gemini, and publishes professional posts to Facebook every 3 hours — with a live web dashboard to monitor everything.**

[Features](#-features) • [Architecture](#-architecture) • [Post Format](#-post-format) • [Setup](#-setup) • [API Reference](#-api-reference) • [Dashboard](#-dashboard) • [FAQ](#-faq)

</div>

---

## 📌 Overview

This is the **Web Edition** of the Autonomous Arabic News Bot — a TypeScript rewrite of the original Python bot, featuring a built-in **Express web server**, a **Vite-powered SPA dashboard**, a **REST API**, and **persistent logging** to SQLite.

Unlike the Python version which runs on GitHub Actions, this edition runs as a **long-running Node.js server** on any hosting platform (Railway, Render, VPS, etc.) and includes a real-time control panel accessible from any browser.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🧠 **AI-Powered Analysis** | Deep political & sports analysis via Google Gemini Flash |
| 📡 **Multi-Source RSS** | Al Jazeera, BBC Arabic, Sport360 — fully configurable |
| 🔥 **Hot News Filter** | Prioritizes breaking news using 40+ Arabic urgency keywords |
| 🖼️ **Smart Image Extraction** | RSS enclosure → `og:image` → `twitter:image` fallback chain |
| 🔄 **Deduplication** | SQLite database prevents any article from being posted twice |
| ⏰ **Built-in Scheduler** | `node-cron` runs the bot every 3 hours automatically |
| 🌐 **Web Dashboard** | Live SPA interface to monitor posts, logs, and trigger runs |
| 📋 **REST API** | Full API to check status, view posts, stream logs, and trigger cycles |
| 🇸🇦 **Pure Arabic Output** | Modern Standard Arabic — no Latin characters in published posts |
| 📝 **Persistent Logging** | All bot activity stored in SQLite and accessible via API |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐  │
│   │  Vite SPA    │     │   Express    │     │  node-cron   │  │
│   │  Dashboard   │────▶│   Server     │◀────│  Scheduler   │  │
│   │  (React/TS)  │     │  :3000       │     │  0 */3 * * * │  │
│   └──────────────┘     └──────┬───────┘     └──────────────┘  │
│                               │                                 │
│              ┌────────────────┼─────────────────┐              │
│              ▼                ▼                 ▼              │
│        ┌──────────┐   ┌──────────────┐  ┌──────────────┐     │
│        │  SQLite  │   │  RSS Parser  │  │ Google Gemini│     │
│        │ Database │   │  (rss-parser)│  │  Flash API   │     │
│        │ posts+   │   │  Al Jazeera  │  │  Analysis +  │     │
│        │  logs    │   │  BBC Arabic  │  │  Rewriting   │     │
│        └──────────┘   │  Sport360   │  └──────┬───────┘     │
│                        └──────────────┘         │             │
│                                                  ▼             │
│                                         ┌──────────────┐      │
│                                         │  Facebook    │      │
│                                         │  Graph API   │      │
│                                         │  v19.0       │      │
│                                         └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Bot Cycle (runs every 3 hours)

```
Fetch RSS Feeds → Filter Hot News → Check Duplicates
       → Gemini Analysis → Extract Image → Post to Facebook
              → Save to SQLite → Log Result
```

---

## 📝 Post Format

Every published post follows this seamless narrative structure (no section labels):

```
🔥 [Compelling Arabic headline summarizing the event]

[3–4 complete sentences reporting the news accurately:
 Who? What happened? Where? How?]

[4-sentence deep analysis paragraph: What the reports
 don't say? Hidden motives? Expected regional consequences?]

[2-sentence bold analyst opinion.]

📌 المصدر: [Source Name]
```

> Posts are written entirely in **Modern Standard Arabic (Fus-ha)** — no Latin characters, no English names, no URLs.

---

## 📦 Requirements

- **Node.js** 20.x or higher
- **npm** 9.x or higher
- A **Google Gemini API key** from [aistudio.google.com](https://aistudio.google.com)
- A **Facebook Page** with a Long-Lived Page Access Token
- Your **Facebook Page ID**

---

## 🚀 Setup

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/arabic-news-bot.git
cd arabic-news-bot
npm install
```

### Step 2 — Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
GEMINI_API_KEY1=your_gemini_api_key_here
FB_PAGE_ACCESS_TOKEN=your_facebook_page_access_token
FB_PAGE_ID=your_facebook_page_id
```

### Step 3 — Run in Development Mode

```bash
npm run dev
```

The server starts at `http://localhost:3000` with hot-reload enabled.

### Step 4 — Build for Production

```bash
npm run build
NODE_ENV=production node dist/server.js
```

---

## 🌐 Dashboard

Once the server is running, open `http://localhost:3000` in your browser to access the live dashboard.

The dashboard provides:

| Panel | Description |
|-------|-------------|
| **Status** | Bot configuration and current state |
| **Posts** | Last 50 articles published to Facebook |
| **Logs** | Last 100 bot activity log entries |
| **Trigger** | Manual run button to force an immediate cycle |

---

## 📡 API Reference

All endpoints are served at `http://localhost:3000/api/`

### `GET /api/status`
Returns the current bot configuration and running status.

```json
{
  "status": "running",
  "config": {
    "POST_INTERVAL_MINUTES": 180,
    "RSS_FEEDS": { "war": [...], "sports": [...] },
    "FB_PAGE_ACCESS_TOKEN": "***"
  }
}
```

### `GET /api/posts`
Returns the last 50 articles posted to Facebook.

```json
[
  {
    "id": 1,
    "url": "https://...",
    "title": "عنوان الخبر",
    "category": "war",
    "posted_at": "2026-04-07T12:00:00.000Z"
  }
]
```

### `GET /api/logs`
Returns the last 100 log entries from the bot.

```json
[
  {
    "id": 1,
    "message": "Bot cycle started",
    "level": "INFO",
    "timestamp": "2026-04-07T12:00:00.000Z"
  }
]
```

### `POST /api/run`
Manually triggers an immediate bot cycle without waiting for the scheduler.

```json
{ "message": "Bot cycle triggered" }
```

---

## 📁 File Structure

```
arabic-news-bot/
│
├── src/                         # Frontend SPA source (Vite + React/TS)
│   └── ...
│
├── server.ts                    # Main Express server + bot logic
├── vite.config.ts               # Vite bundler configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies and scripts
├── .env.example                 # Environment variables template
├── .gitignore                   # Ignored files (includes .env)
├── news_bot.db                  # SQLite database (auto-created)
└── README.md                    # This file
```

---

## 🔧 Configuration

All bot settings are defined in the `config` object inside `server.ts`:

```typescript
const config = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY1 || "",
  FB_PAGE_ACCESS_TOKEN: process.env.FB_PAGE_ACCESS_TOKEN || "",
  FB_PAGE_ID: process.env.FB_PAGE_ID || "",
  POST_INTERVAL_MINUTES: 180,
  RSS_FEEDS: {
    war: [
      "https://www.aljazeera.net/rss",
      "https://feeds.bbci.co.uk/arabic/rss.xml",
    ],
    sports: [
      "https://arabic.sport360.com/feed/",
    ],
  },
};
```

### Changing the Schedule

The cron expression is set in `startServer()`:

```typescript
cron.schedule("0 */3 * * *", () => runBotCycle());
```

| Cron Expression | Frequency |
|----------------|-----------|
| `0 */1 * * *` | Every 1 hour |
| `0 */3 * * *` | Every 3 hours (default) |
| `0 */6 * * *` | Every 6 hours |
| `0 8,14,20 * * *` | At 8am, 2pm, 8pm UTC |

### Adding RSS Sources

Add URLs to the `RSS_FEEDS` object in `server.ts`:

```typescript
RSS_FEEDS: {
  war: [
    "https://www.aljazeera.net/rss",
    "https://feeds.bbci.co.uk/arabic/rss.xml",
    "https://your-new-source.com/rss",  // ← Add here
  ],
  sports: [
    "https://arabic.sport360.com/feed/",
    "https://your-sports-source.com/feed", // ← Or here
  ],
},
```

---

## 🔑 Facebook Permissions

The Page Access Token requires these permissions:

| Permission | Purpose |
|------------|---------|
| `pages_manage_posts` | Create posts and upload photos |
| `pages_read_engagement` | Read page metadata |

> ⚠️ Always use a **Long-Lived Page Token** — standard tokens expire in ~1 hour.

---

## 🛠️ Tech Stack

| Package | Purpose |
|---------|---------|
| [express](https://expressjs.com/) | HTTP server & REST API |
| [vite](https://vitejs.dev/) | Frontend SPA bundler with HMR |
| [@google/genai](https://ai.google.dev/) | Gemini Flash AI analysis |
| [rss-parser](https://www.npmjs.com/package/rss-parser) | RSS feed parsing |
| [cheerio](https://cheerio.js.org/) | HTML scraping for og:image |
| [better-sqlite3](https://www.npmjs.com/package/better-sqlite3) | SQLite deduplication & logging |
| [node-cron](https://www.npmjs.com/package/node-cron) | Cron scheduler |
| [axios](https://axios-http.com/) | HTTP client for Facebook API |
| [dotenv](https://www.npmjs.com/package/dotenv) | Environment variable loading |

---

## ❓ FAQ

**Q: How is this different from the Python version?**
This edition runs as a persistent web server with a dashboard and REST API. The Python version runs as scheduled one-off jobs on GitHub Actions. Both produce identical Facebook posts.

**Q: Where is the database stored?**
`news_bot.db` is created automatically in the project root on first run. It stores all posted article URLs and all bot logs.

**Q: Can I run both bots simultaneously?**
Yes — as long as they post to different Facebook Pages or use different databases, they won't conflict.

**Q: The Gemini API returns errors — what do I do?**
Check `GET /api/logs` for the exact error. Common causes: invalid API key, daily quota exceeded (1,500 req/day on free tier), or model name mismatch.

**Q: How do I deploy to production?**
Run `npm run build` then start with `NODE_ENV=production node dist/server.js`. Compatible with Railway, Render, Fly.io, or any VPS running Node.js 20+.

---

## 📄 License

This project is licensed under the **MIT License** — free to use, modify, and distribute.

---

<div align="center">

Built with ❤️ and 🤖

*Star ⭐ this repo if you found it useful!*

</div>
