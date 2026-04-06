import "dotenv/config";
import Database from "better-sqlite3";
import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import Parser from "rss-parser";
import * as cheerio from "cheerio";
import cron from "node-cron";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
});

app.use(cors());
app.use(express.json());

// --- Configuration ---
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

// --- Database ---
const DB_PATH = path.join(process.cwd(), "news_bot.db");
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS posted_articles (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    url       TEXT    UNIQUE NOT NULL,
    title     TEXT,
    category  TEXT,
    posted_at TEXT    NOT NULL
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    message   TEXT,
    level     TEXT,
    timestamp TEXT    NOT NULL
  )
`);

function log(message: string, level: string = "INFO") {
  console.log(`[${level}] ${message}`);
  db.prepare("INSERT INTO logs (message, level, timestamp) VALUES (?, ?, ?)").run(
    message,
    level,
    new Date().toISOString()
  );
}

async function isDuplicate(url: string): Promise<boolean> {
  const row = db.prepare("SELECT 1 FROM posted_articles WHERE url = ?").get(url);
  return !!row;
}

function markAsPosted(url: string, title: string, category: string) {
  db.prepare(
    "INSERT OR IGNORE INTO posted_articles (url, title, category, posted_at) VALUES (?, ?, ?, ?)"
  ).run(url, title, category, new Date().toISOString());
}

// --- Bot Logic ---

const HOT_KEYWORDS = [
  "عاجل", "قتل", "قصف", "هجوم", "غارة", "انفجار", "اغتيال", "حرب",
  "معركة", "اتفاق", "صفقة", "اعتقال", "إعدام", "انسحاب", "توغل",
  "قرار", "تصريح", "تهديد", "أزمة", "انقلاب", "احتجاج", "مظاهرة",
  "فوز", "خسارة", "هدف", "بطولة", "انتقال", "إصابة", "إيقاف",
  "بيع", "تعاقد", "طرد", "استقالة", "تتويج", "نهائي",
  "ترامب", "بوتين", "نتنياهو", "إيران", "غزة", "أوكرانيا",
  "ريال مدريد", "برشلونة", "ليفربول", "مانشستر", "الأهلي", "النصر",
];

const BORING_KEYWORDS = [
  "ما هي", "كيف تعرف", "دليل", "شرح", "تعرف على",
  "أبرز المضائق", "قائمة", "نصائح", "كيفية", "مقدمة", "مفهوم",
];

function isHotArticle(title: string, summary: string): boolean {
  const text = (title + " " + summary).toLowerCase();
  if (BORING_KEYWORDS.some(kw => text.includes(kw))) return false;
  return HOT_KEYWORDS.some(kw => text.includes(kw));
}

async function fetchArticles() {
  const articles: any[] = [];
  for (const [category, urls] of Object.entries(config.RSS_FEEDS)) {
    for (const feedUrl of urls) {
      try {
        log(`Fetching [${category.toUpperCase()}]: ${feedUrl}`);
        const feed = await parser.parseURL(feedUrl);
        for (const item of feed.items.slice(0, 15)) {
          if (!item.link || !item.title) continue;
          articles.push({
            url: item.link,
            title: item.title,
            summary: (item.contentSnippet || item.content || "").substring(0, 1500),
            image_url: item.enclosure?.url || null,
            category,
            source: feed.title || new URL(feedUrl).hostname,
            is_hot: isHotArticle(item.title, item.contentSnippet || ""),
          });
        }
      } catch (err: any) {
        log(`Feed error ${feedUrl}: ${err.message}`, "ERROR");
      }
    }
  }
  return articles;
}

async function getBestImage(article: any) {
  if (article.image_url) return article.image_url;
  try {
    const { data: html } = await axios.get(article.url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    const $ = cheerio.load(html);
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage) return ogImage;
    const twitterImage = $('meta[name="twitter:image"]').attr("content");
    if (twitterImage) return twitterImage;
    return null;
  } catch (err) {
    return null;
  }
}

const WAR_PROMPT = `أنت محرر صحفي وسياسي محترف في صفحة إخبارية عربية على فيسبوك.

مهمتك: اكتب منشوراً متكاملاً يذكر الخبر أولاً ثم يحلله.

قواعد صارمة جداً:
١- اكتب باللغة العربية الفصحى حصراً. لا تكتب أي حرف لاتيني إطلاقاً، حتى في أسماء الأشخاص والدول والمدن — استخدم دائماً الاسم العربي.
٢- كل جملة يجب أن تكون مكتملة ومفهومة تماماً.
٣- لا ترقيم (أولاً، ثانياً...). لا روابط. لا تذكر المصدر.
٤- لا تستخدم كلمات توضيحية مثل "الخبر" أو "التحليل" أو "رأي المحلل". ادمج المحتوى بشكل انسيابي.
٥- لا تتجاوز ٢٨٠ كلمة.

اكتب المنشور بهذا الشكل الحرفي:

[إيموجي مناسب للخبر] [عنوان جذاب ومثير يلخص الحدث]

[اذكر تفاصيل الحدث بدقة وأمانة في ٣ إلى ٤ جمل مكتملة. أجب عن: ماذا حدث؟ من الأطراف؟ أين وكيف؟]

[اكتب تحليلاً عميقاً في فقرة من ٤ جمل مكتملة. تناول: ما الذي لا تقوله التقارير؟ ما الدوافع الخفية؟ ما التداعيات المتوقعة على المنطقة؟]

[اكتب رأيك الصريح والجريء في جملتين مكتملتين.]

الخبر المراد تحليله:
العنوان: {title}
التفاصيل: {summary}`;

const SPORTS_PROMPT = `أنت محرر صحفي رياضي محترف في صفحة رياضية عربية على فيسبوك.

مهمتك: اكتب منشوراً متكاملاً يذكر الخبر أولاً ثم يحلله.

قواعد صارمة جداً:
١- اكتب باللغة العربية الفصحى حصراً. لا تكتب أي حرف لاتيني إطلاقاً، حتى في أسماء اللاعبين والأندية — استخدم دائماً الاسم العربي.
٢- كل جملة يجب أن تكون مكتملة ومفهومة تماماً.
٣- لا ترقيم. لا روابط. لا تذكر المصدر. استخدم إيموجي رياضية باعتدال.
٤- لا تستخدم كلمات توضيحية مثل "الخبر" أو "التحليل" أو "رأي المحلل". ادمج المحتوى بشكل انسيابي.
٥- لا تتجاوز ٢٢٠ كلمة.

اكتب المنشور بهذا الشكل الحرفي:

[إيموجي رياضي] [عنوان جذاب يشعل الحماس]

[اذكر تفاصيل الحدث بدقة في ٢ إلى ٣ جمل مكتملة. من؟ ماذا حدث؟ أين؟]

[اكتب تحليلاً في فقرة من ٣ جمل مكتملة. تناول: ما أهمية هذا الخبر؟ كيف يؤثر على الفريق أو البطولة؟]

[رأيك الصريح في جملتين مكتملتين.]

الخبر المراد تحليله:
العنوان: {title}
التفاصيل: {summary}`;

async function analyzeWithGemini(title: string, summary: string, category: string, source: string) {
  if (!config.GEMINI_API_KEY) {
    log("GEMINI_API_KEY is missing", "ERROR");
    return null;
  }
  const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  const promptTemplate = category === "war" ? WAR_PROMPT : SPORTS_PROMPT;
  const prompt = promptTemplate.replace("{title}", title).replace("{summary}", summary);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.8,
      },
    });

    let text = response.text || "";
    // Clean text
    text = text.replace(/📌[^\n]*\n?/g, "");
    text = text.replace(/https?:\/\/\S+/g, "");
    text = text.replace(/🔗[^\n]*\n?/g, "");
    text = text.replace(/📰 الخبر:|🔍 التحليل:|💬 رأي المحلل:/g, "");
    text = text.replace(/\n{3,}/g, "\n\n");
    
    if (text.length < 50) {
      log("Gemini output too short", "WARNING");
      return null;
    }

    return `${text.trim()}\n\n📌 المصدر: ${source}`;
  } catch (err: any) {
    log(`Gemini error: ${err.message}`, "ERROR");
    return null;
  }
}

async function postToFacebook(caption: string, imageUrl: string | null) {
  if (!config.FB_PAGE_ACCESS_TOKEN || !config.FB_PAGE_ID) {
    log("Facebook credentials missing", "ERROR");
    return false;
  }
  try {
    const endpoint = imageUrl
      ? `https://graph.facebook.com/v19.0/${config.FB_PAGE_ID}/photos`
      : `https://graph.facebook.com/v19.0/${config.FB_PAGE_ID}/feed`;
    
    const payload: any = {
      access_token: config.FB_PAGE_ACCESS_TOKEN,
      [imageUrl ? "caption" : "message"]: caption,
    };
    if (imageUrl) payload.url = imageUrl;

    const resp = await axios.post(endpoint, payload);
    if (resp.data.id || resp.data.post_id) {
      log(`Posted to Facebook! ID: ${resp.data.post_id || resp.data.id}`);
      return true;
    }
    return false;
  } catch (err: any) {
    log(`Facebook error: ${JSON.stringify(err.response?.data || err.message)}`, "ERROR");
    return false;
  }
}

async function runBotCycle() {
  log("Bot cycle started");
  const articles = await fetchArticles();
  const newArticles = [];
  for (const a of articles) {
    if (!(await isDuplicate(a.url))) {
      newArticles.push(a);
    }
  }

  log(`New articles found: ${newArticles.length}`);
  if (newArticles.length === 0) return;

  const hot = newArticles.filter(a => a.is_hot);
  const article = hot.length > 0 ? hot[0] : newArticles[0];

  log(`Processing article: ${article.title.substring(0, 50)}...`);

  const analysis = await analyzeWithGemini(article.title, article.summary, article.category, article.source);
  if (!analysis) {
    log("Analysis failed", "WARNING");
    return;
  }

  const imageUrl = await getBestImage(article);
  const success = await postToFacebook(analysis, imageUrl);

  if (success) {
    markAsPosted(article.url, article.title, article.category);
  }
}

// --- API Endpoints ---

app.get("/api/status", (req, res) => {
  res.json({ status: "running", config: { ...config, FB_PAGE_ACCESS_TOKEN: "***" } });
});

app.get("/api/posts", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM posted_articles ORDER BY posted_at DESC LIMIT 50").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/logs", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/run", async (req, res) => {
  runBotCycle();
  res.json({ message: "Bot cycle triggered" });
});

// --- Server & Vite Setup ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    log(`Server running on http://localhost:${PORT}`);
    
    // Schedule the bot: Every 3 hours at minute 0
    cron.schedule("0 */3 * * *", () => {
      runBotCycle();
    });
    
    // Run once on start
    runBotCycle();
  });
}

startServer();
