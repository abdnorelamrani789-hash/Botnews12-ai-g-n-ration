🧠 Autonomous AI News Bot for Facebook — محلل أخبار ذكي

============================================================

📌 OVERVIEW
This project is a fully autonomous, AI-powered news publishing bot designed to fetch, analyze, and post high-quality news content directly to a Facebook page.

It performs:
- Fetching RSS feeds
- Filtering important news
- AI analysis (Gemini)
- Image extraction
- Facebook posting
- Duplicate prevention

============================================================

🚀 FEATURES

📰 News Aggregation
- Multiple RSS feeds
- Extracts title, summary, source, image

🔥 Smart Filtering
- Detects hot news
- Filters boring content

🧠 AI Analysis
- Arabic professional posts
- Structured:
  - Title
  - News
  - Analysis
  - Opinion

🖼️ Image System
- RSS images
- OpenGraph scraping
- Size validation (>80KB)

🧹 Cleaning
- Removes links
- Adds source

🗄️ Database
- SQLite
- Prevent duplicates

📤 Facebook Posting
- Posts with image or text
- Graph API

🔁 Automation Cycle
Fetch → Filter → Analyze → Post → Save

📊 Logging
- Console + file logs

============================================================

⚙️ TECHNOLOGIES
- Python 3.10+
- SQLite
- requests
- feedparser
- BeautifulSoup (optional)
- Google Gemini API

============================================================

📋 PREREQUISITES
- Python installed
- Facebook Page
- Access Token
- Gemini API Key

============================================================

🛠️ INSTALLATION

git clone <repo-url>
cd news-bot

pip install requests feedparser beautifulsoup4 google-generativeai

============================================================

⚙️ CONFIGURATION

Create config.json:

{
  "GEMINI_API_KEY": "your_key",
  "FB_PAGE_ACCESS_TOKEN": "your_token",
  "FB_PAGE_ID": "your_page_id",
  "POST_INTERVAL_MINUTES": 180,
  "RSS_FEEDS": {
    "war": [
      "https://www.aljazeera.net/xml/rss/all.xml",
      "https://feeds.bbci.co.uk/arabic/rss.xml"
    ],
    "sports": [
      "https://arabic.sport360.com/feed/",
      "https://www.filgoal.com/rss"
    ]
  }
}

============================================================

🔐 ENV VARIABLES (Alternative)

export GEMINI_API_KEY=your_key
export FB_PAGE_ACCESS_TOKEN=your_token
export FB_PAGE_ID=your_page_id

============================================================

▶️ USAGE

python main.py

Workflow:
1. Load config
2. Init DB
3. Fetch RSS
4. Filter news
5. Analyze with AI
6. Extract image
7. Post to Facebook
8. Save to DB

============================================================

🔄 AUTOMATION (GitHub Actions)

.github/workflows/bot.yml

name: News Bot

on:
  schedule:
    - cron: '0 */3 * * *'
  workflow_dispatch:

jobs:
  run:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-python@v4
        with:
          python-version: 3.10

      - run: pip install requests feedparser beautifulsoup4 google-generativeai

      - run: python main.py
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          FB_PAGE_ACCESS_TOKEN: ${{ secrets.FB_PAGE_ACCESS_TOKEN }}
          FB_PAGE_ID: ${{ secrets.FB_PAGE_ID }}

============================================================

⚠️ LIMITATIONS

- Gemini API limits (429 errors)
- Facebook token expiration
- SQLite not persistent in cloud
- Image scraping may fail
- RSS feeds may break

============================================================

📁 STRUCTURE

main.py
config.json
news_bot.db
news_bot.log

============================================================

🚀 FUTURE IDEAS

- Multi-post per cycle
- More categories
- AI image generation
- Dashboard
- Multi-platform posting

============================================================
