const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

async function beritabola() {
  try {
    const browser = await puppeteer.launch({
      headless: "new", // pakai true juga bisa
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // buat environment server/VPS
    });
    const page = await browser.newPage();

    await page.goto("https://vivagoal.com/category/berita-bola/", {
      waitUntil: "networkidle2",
      timeout: 0
    });

    const html = await page.content();
    await browser.close();

    const $ = cheerio.load(html);
    const articles = [];

    // Headline/utama
    $(".td-big-grid-wrapper .td-module-thumb").each((i, el) => {
      const url = $(el).find("a").attr("href");
      const image = $(el).find("img").attr("src") || $(el).find("img").attr("data-src");
      const title = $(el).find("img").attr("title") || $(el).find("a").attr("title");
      if (url && title) {
        articles.push({ url, image, title, categories: [] });
      }
    });

    // Artikel biasa
    $(".td_block_wrap .td_module_6").each((i, el) => {
      const url = $(el).find("a").attr("href");
      const image = $(el).find("img").attr("src") || $(el).find("img").attr("data-src");
      const title = $(el).find(".entry-title").text().trim();
      const categories = [];
      $(el).find(".td-post-category a").each((i, cat) => {
        categories.push($(cat).text().trim());
      });

      if (url && title) {
        articles.push({ url, image, title, categories });
      }
    });

    return articles;
  } catch (error) {
    console.error("❌ Puppeteer scraping error:", error.message);
    throw new Error("Gagal mengambil berita bola.");
  }
}

// ✅ Ekspor ke routing Express
module.exports = function (app) {
  app.get('/news/beritabola', async (req, res) => {
    try {
      const result = await beritabola();
      res.status(200).json({
        status: true,
        creator: 'ZenzzXD',
        result
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: err.message || 'Internal server error'
      });
    }
  });
};
