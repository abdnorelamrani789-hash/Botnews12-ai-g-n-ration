# 🤖 Autonomous Arabic News Bot for Facebook

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-orange?style=for-the-badge&logo=google&logoColor=white)
![Facebook](https://img.shields.io/badge/Facebook-Graph_API-1877F2?style=for-the-badge&logo=facebook&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-Automated-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A fully autonomous AI-powered news bot that fetches breaking news from trusted Arabic & international sources, analyzes it using Google Gemini, and publishes professional Arabic posts to a Facebook Page every 3 hours — completely free.**

[Features](#-features) • [How It Works](#-how-it-works) • [Post Format](#-post-format) • [Setup](#-setup) • [Configuration](#-configuration) • [FAQ](#-faq)

</div>

---

## 📌 Overview

This bot is a production-ready Python automation pipeline running on **GitHub Actions**. It combines RSS feed parsing, AI-powered news analysis, smart image extraction, and Facebook publishing into a single zero-maintenance workflow.

Every run, the bot:
- Fetches the latest articles from multiple RSS feeds
- Prioritizes **breaking and high-impact news** using keyword filtering
- Skips already-posted articles using a **SQLite deduplication database**
- Rewrites and deeply analyzes the article using **Gemini 2.5 Flash**
- Finds a high-quality image from the article page automatically
- Publishes a complete, professional Arabic post to your Facebook Page

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🧠 **AI-Powered Analysis** | Deep geopolitical & sports analysis via Gemini 2.5 Flash |
| 📡 **Multi-Source RSS** | Al Jazeera, BBC Arabic, Sport360, FilGoal |
| 🔥 **Hot News Filter** | Prioritizes breaking news using 40+ Arabic keywords |
| 🖼️ **Smart Image Extraction** | RSS → `og:image` → `twitter:image` → BeautifulSoup fallback |
| 🔄 **Deduplication** | SQLite database persisted in GitHub — no repeated posts |
| ⏰ **Fully Automated** | Runs every 3 hours via GitHub Actions cron scheduler |
| 🇸🇦 **Pure Arabic Output** | Modern Standard Arabic (Fus-ha) — no English words in posts |
| 🆓 **100% Free** | Runs entirely on free tiers (GitHub Actions + Gemini API) |

---

## ⚙️ How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                     Bot Workflow (per run)                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Fetch Articles    →  Parse RSS feeds (up to 15/feed)    │
│          ↓                                                   │
│  2. Filter News       →  Hot keywords → breaking news first  │
│          ↓                                                   │
│  3. Check Duplicates  →  SQLite DB stored in GitHub repo     │
│          ↓                                                   │
│  4. AI Analysis       →  Gemini 2.5 Flash generates post    │
│          ↓                                                   │
│  5. Image Extraction  →  RSS → og:image → scrape fallback   │
│          ↓                                                   │
│  6. Publish           →  Facebook Graph API v19.0            │
│          ↓                                                   │
│  7. Save Record       →  Commit news_bot.db to GitHub       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📝 Post Format

Every published post follows this exact structure:

```
🔥 [Compelling headline that captures the essence of the event]

📰 The News:
A clear and accurate summary of what happened in 3–4 complete
sentences. Answers: Who? What? Where? When?

🔍 Analysis:
Deep analytical paragraph uncovering hidden dimensions, real
motives, and expected consequences — 4 complete sentences.

💬 Analyst's Take:
A bold, direct opinion in 1–2 complete sentences.

📌 Source: [Source Name]
```

---

## 📦 Requirements

Before setting up, make sure you have:

- A **GitHub account** (free)
- A **Gemini API key** from [aistudio.google.com](https://aistudio.google.com) (free)
- A **Facebook Page** with a Long-Lived Page Access Token
- Your **Facebook Page ID**

---

## 🚀 Setup

### Step 1 — Fork or Clone the Repository

```bash
git clone https://github.com/your-username/facebook-news-bot.git
cd facebook-news-bot
```

### Step 2 — Add GitHub Secrets

Go to **Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description |
|-------------|-------------|
| `GEMINI_API_KEY` | Your Google AI Studio API key |
| `FB_PAGE_ACCESS_TOKEN` | Facebook Long-Lived Page Access Token |
| `FB_PAGE_ID` | Your Facebook Page numeric ID |

### Step 3 — Enable Workflow Write Permissions

Go to **Settings → Actions → General → Workflow permissions**
Select ✅ **Read and write permissions** → Save

### Step 4 — Run the Bot

Go to **Actions → Facebook News Bot → Run workflow → Run workflow**

The bot will immediately fetch, analyze, and publish one article.
After that, it runs automatically every 3 hours.

---

## 📁 File Structure

```
facebook-news-bot/
│
├── .github/
│   └── workflows/
│       └── run_bot.yml          # Cron scheduler & CI pipeline
│
├── facebook_news_bot.py         # Core bot logic
├── run_once.py                  # Entry point for single execution
├── requirements.txt             # Python dependencies
├── news_bot.db                  # SQLite deduplication database (auto-created)
└── README.md                    # This file
```

---

## 🔧 Configuration

All settings are defined inside `run_bot.yml` under the `Create config.json` step.

### Posting Schedule

Edit the cron expression in `run_bot.yml`:

```yaml
on:
  schedule:
    - cron: '0 */3 * * *'   # Every 3 hours
```

Common schedules:

| Cron Expression | Frequency |
|----------------|-----------|
| `0 */1 * * *` | Every 1 hour |
| `0 */3 * * *` | Every 3 hours (default) |
| `0 */6 * * *` | Every 6 hours |
| `0 8,14,20 * * *` | At 8am, 2pm, 8pm UTC |

### RSS Feed Sources

Add or remove sources in the `RSS_FEEDS` section of `run_bot.yml`:

```python
'RSS_FEEDS': {
    'war': [
        'https://www.aljazeera.net/xml/rss/all.xml',   # Al Jazeera Arabic
        'https://feeds.bbci.co.uk/arabic/rss.xml',      # BBC Arabic
        # Add more war/politics feeds here
    ],
    'sports': [
        'https://arabic.sport360.com/feed/',             # Sport360
        'https://www.filgoal.com/rss',                   # FilGoal
        # Add more sports feeds here
    ]
}
```

---

## 🔑 Facebook Permissions

The Page Access Token requires these permissions:

| Permission | Purpose |
|------------|---------|
| `pages_manage_posts` | Create posts and upload photos |
| `pages_read_engagement` | Read page metadata |

### Getting a Long-Lived Page Token

1. Go to [developers.facebook.com](https://developers.facebook.com) → Create a **Business** app
2. Add the **Pages API** product
3. Open **Graph API Explorer** → Select your app → Select your Page
4. Add permissions: `pages_manage_posts`, `pages_read_engagement`
5. Click **Generate Access Token** and copy it

> ⚠️ **Important:** Standard user tokens expire in ~1 hour. Always use a **Long-Lived Page Token** which does not expire for Pages.

---

## 📊 Free Tier Usage

| Service | Free Limit | Daily Bot Usage |
|---------|-----------|----------------|
| GitHub Actions | 2,000 min/month | ~2 min/run × 8 runs = ~16 min/day |
| Gemini API | 1,500 req/day | 8 requests/day |
| Facebook Graph API | Unlimited | 8 posts/day |

**Monthly cost: $0.00** ✅

---

## 🛠️ Tech Stack

| Library | Purpose |
|---------|---------|
| [feedparser](https://feedparser.readthedocs.io/) | RSS feed parsing |
| [google-genai](https://ai.google.dev/) | Gemini 2.5 Flash AI analysis |
| [requests](https://requests.readthedocs.io/) | HTTP requests & image validation |
| [beautifulsoup4](https://www.crummy.com/software/BeautifulSoup/) | HTML scraping for fallback images |
| [sqlite3](https://docs.python.org/3/library/sqlite3.html) | Deduplication database |
| [GitHub Actions](https://github.com/features/actions) | Automated scheduling |

---

## ❓ FAQ

**Q: Why is the bot not posting?**
Check the Actions tab for errors. Common causes: expired Facebook token, Gemini quota exceeded, or no new articles found.

**Q: Will it post duplicate articles?**
No. Every posted URL is saved in `news_bot.db` which is committed back to the repository after each run, ensuring no duplicates even across separate runs.

**Q: Can I add more Facebook pages?**
Yes. Duplicate the `post_to_facebook()` call in `run_bot_cycle()` with a different `page_id` and `access_token`.

**Q: The Gemini quota runs out — what do I do?**
The bot has a built-in retry mechanism with automatic wait time extracted from the API error. For heavy usage, enable billing on Google Cloud (Gemini 2.5 Flash costs ~$0.15 per million tokens).

**Q: Can I change the post language?**
Yes. Modify the `WAR_PROMPT` and `SPORTS_PROMPT` variables in `facebook_news_bot.py` to instruct Gemini to write in any language.

---

## 📄 License

This project is licensed under the **MIT License** — free to use, modify, and distribute.

---

<div align="center">

Built with ❤️ and 🤖 by AI automation

*Star ⭐ this repo if you found it useful!*

</div>
