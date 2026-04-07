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
import FormData from "form-data";
import sharp from "sharp";
import { GoogleGenAI, Modality } from "@google/genai";
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
  GEMINI_IMAGE_KEY: process.env.GEMINI_API_KEY2 || process.env.GEMINI_API_KEY1 || "",
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

// --- Helper: Retry Logic ---
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable = 
        err.message?.includes("429") || 
        err.message?.includes("RESOURCE_EXHAUSTED") ||
        err.message?.includes("503") ||
        err.message?.includes("UNAVAILABLE");

      if (isRetryable && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 5000; // 5s, 10s, 20s...
        log(`Gemini busy or quota hit, retrying in ${delay / 1000}s... (Attempt ${i + 1}/${maxRetries})`, "WARNING");
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
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

const WAR_PROMPT = `أنت محرر صحفي وسياسي محترف في صفحة إخبارية عربية على فيسبوك (الميدان - AL MYDAN).
مهمتك: تحويل الخبر إلى منشور "Viral" يجذب الانتباه ويحفز التفاعل.

الهيكل المطلوب للمنشور (التزم بالترتيب التالي دون كتابة أي عناوين جانبية أو تسميات للأقسام أو إيموجي للأقسام):

١- [الـ Hook]: ابدأ بجملة صادمة أو تساؤل مثير يحبس السكرول (استخدم إيموجي 🚨 أو 🔴 أو 😳 في البداية). مثال: "🚨 تطور مفاجئ يقلب الموازين.. ماذا يحدث الآن؟"

٢- [الملخص]: اكتب ملخصاً مكثفاً للحدث في سطرين فقط (ابدأ النص مباشرة بدون إيموجي).

٣- [التفاصيل]: اعرض أهم ٣ نقاط في شكل قائمة (Bullet points) تبدأ بـ "-" (ابدأ القائمة مباشرة بدون إيموجي).

٤- [التحليل]: تحليل ذكي وقصير جداً في جملتين حول التداعيات أو الدوافع الخفية (ابدأ النص مباشرة بدون إيموجي).

قواعد صارمة جداً:
- ممنوع منعاً باتاً كتابة كلمات مثل "ماذا حدث؟" أو "التفاصيل:" أو "ماذا يعني هذا؟" أو أي عناوين للأقسام.
- ممنوع استخدام الإيموجي في بداية الأقسام (📌، 📊، 🤔)؛ استخدم الإيموجي فقط في سطر الـ Hook الأول.
- لغة عربية فصحى بسيطة وقوية.
- لا تذكر المصدر. لا روابط.
- استخدم الهاشتاجات الأكثر انتشاراً في النهاية (٥-٧ هاشتاجات).
- المجموع الكلي للنص لا يتجاوز ١٥٠ كلمة.

الخبر المراد معالجته:
العنوان: {title}
التفاصيل: {summary}`;

const SPORTS_PROMPT = `أنت محرر رياضي محترف في صفحة (الميدان الرياضي - AL MYDAN).
مهمتك: تحويل الخبر الرياضي إلى منشور حماسي "Viral" يثير تفاعل المشجعين.

الهيكل المطلوب للمنشور (التزم بالترتيب التالي دون كتابة أي عناوين جانبية أو تسميات للأقسام أو إيموجي للأقسام):

١- [الـ Hook]: ابدأ بجملة حماسية أو تساؤل مثير (استخدم إيموجي ⚽️ أو 🔥 أو 😱). مثال: "🔥 زلزال في الميركاتو.. هل ينتقل النجم الكبير؟"

٢- [الملخص]: ملخص سريع للخبر في سطرين (ابدأ النص مباشرة بدون إيموجي).

٣- [التفاصيل]: اعرض أهم ٣ نقاط في شكل قائمة (Bullet points) تبدأ بـ "-" (ابدأ القائمة مباشرة بدون إيموجي).

٤- [التحليل]: تحليل رياضي سريع في جملتين حول تأثير الخبر على الفريق أو البطولة (ابدأ النص مباشرة بدون إيموجي).

قواعد صارمة جداً:
- ممنوع منعاً باتاً كتابة كلمات مثل "ماذا حدث؟" أو "التفاصيل:" أو "ماذا يعني هذا؟" أو أي عناوين للأقسام.
- ممنوع استخدام الإيموجي في بداية الأقسام (📌، 📊، 🤔)؛ استخدم الإيموجي فقط في سطر الـ Hook الأول.
- لغة عربية فصحى حماسية.
- لا تذكر المصدر. لا روابط.
- هاشتاجات رياضية قوية في النهاية.
- المجموع الكلي للنص لا يتجاوز ١٢٠ كلمة.

الخبر المراد معالجته:
العنوان: {title}
التفاصيل: {summary}`;

async function analyzeWithGemini(title: string, summary: string, category: string, source: string) {
  const keys = [process.env.GEMINI_API_KEY1, process.env.GEMINI_API_KEY2].filter(Boolean) as string[];
  if (keys.length === 0) {
    log("No Gemini API keys configured", "ERROR");
    return null;
  }

  const promptTemplate = category === "war" ? WAR_PROMPT : SPORTS_PROMPT;
  const prompt = promptTemplate.replace("{title}", title).replace("{summary}", summary);

  for (const key of keys) {
    const ai = new GoogleGenAI({ apiKey: key });
    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          temperature: 0.8,
        },
      }));

      let text = response.text || "";
      text = text.replace(/https?:\/\/\S+/g, "");
      text = text.replace(/📰 الخبر:|🔍 التحليل:|💬 رأي المحلل:/g, "");
      text = text.replace(/\n{3,}/g, "\n\n");
      
      if (text.length < 50) continue; 

      return `${text.trim()}\n\n📌 المصدر: ${source}`;
    } catch (err: any) {
      const isRetryable = 
        err.message?.includes("429") || 
        err.message?.includes("RESOURCE_EXHAUSTED") ||
        err.message?.includes("503") ||
        err.message?.includes("UNAVAILABLE");

      if (isRetryable) {
        log(`Key busy or quota exhausted, trying next key if available...`, "WARNING");
        continue;
      }
      log(`Gemini text error: ${err.message}`, "ERROR");
      break; 
    }
  }
  return null;
}

async function enhanceImage(imageUrl: string, category: string) {
  if (!imageUrl) return null;
  try {
    log(`Enhancing image: ${imageUrl.substring(0, 50)}...`);
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    const width = 1080;
    const height = 1350; 

    const label = category === "war" ? "🚨 عاجل" : "🔴 خبر مهم";
    const svgOverlay = `
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(0,0,0,0);stop-opacity:0" />
            <stop offset="100%" style="stop-color:rgba(0,0,0,0.8);stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect x="0" y="${height - 300}" width="${width}" height="300" fill="url(#grad)" />
        <rect x="50" y="${height - 150}" width="250" height="80" rx="10" fill="#e11d48" />
        <text x="175" y="${height - 95}" font-family="Arial, sans-serif" font-size="45" font-weight="bold" fill="white" text-anchor="middle">${label}</text>
        <text x="${width - 50}" y="${height - 95}" font-family="Arial, sans-serif" font-size="30" fill="rgba(255,255,255,0.7)" text-anchor="end">AL MYDAN</text>
      </svg>
    `;

    const processedBuffer = await sharp(buffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .modulate({
        brightness: 1.05,
        saturation: 1.1
      })
      .clahe({ width: 50, height: 50 }) 
      .sharpen()
      .tint({ r: 255, g: 240, b: 230 }) 
      .composite([{
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0
      }])
      .toBuffer();

    return processedBuffer;
  } catch (err: any) {
    log(`Image enhancement error: ${err.message}`, "ERROR");
    return null;
  }
}

async function postToFacebook(caption: string, image: string | Buffer | null) {
  if (!config.FB_PAGE_ACCESS_TOKEN || !config.FB_PAGE_ID) {
    log("Facebook credentials missing", "ERROR");
    return false;
  }
  try {
    const isBuffer = Buffer.isBuffer(image);
    const endpoint = image
      ? `https://graph.facebook.com/v19.0/${config.FB_PAGE_ID}/photos`
      : `https://graph.facebook.com/v19.0/${config.FB_PAGE_ID}/feed`;
    
    if (isBuffer) {
      const form = new FormData();
      form.append('source', image, { filename: 'image.png' });
      form.append('caption', caption);
      form.append('access_token', config.FB_PAGE_ACCESS_TOKEN);
      
      const resp = await axios.post(endpoint, form, {
        headers: form.getHeaders(),
      });
      if (resp.data.id || resp.data.post_id) {
        log(`Posted to Facebook with AI Image! ID: ${resp.data.post_id || resp.data.id}`);
        return true;
      }
    } else {
      const payload: any = {
        access_token: config.FB_PAGE_ACCESS_TOKEN,
        [image ? "caption" : "message"]: caption,
      };
      if (image) payload.url = image;

      const resp = await axios.post(endpoint, payload);
      if (resp.data.id || resp.data.post_id) {
        log(`Posted to Facebook! ID: ${resp.data.post_id || resp.data.id}`);
        return true;
      }
    }
    return false;
  } catch (err: any) {
    log(`Facebook error: ${JSON.stringify(err.response?.data || err.message)}`, "ERROR");
    return false;
  }
}

// ⚠️ زدت ليها كلمة export باش نقدرو نستعملوها فملف run-bot.ts ⚠️
export async function runBotCycle() {
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

  const originalImageUrl = await getBestImage(article);
  const enhancedImage = await enhanceImage(originalImageUrl, article.category);
  
  const success = await postToFacebook(analysis, enhancedImage || originalImageUrl);

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

// ⚠️ هاد الشرط هو السر: كيخلي السيرفر يخدم غير فالحاسوب ديالك أو فالسيرفر الشخصي، 
// وكيحبسو فـ GitHub Actions باش ما يبقاش معلق ⚠️
if (!process.env.GITHUB_ACTIONS) {
  startServer();
}

