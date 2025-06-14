const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

async function beritabola() {
  try {
    const response = await axios.get("https://vivagoal.com/category/berita-bola/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }), // <<< ini solusi SSL error
      validateStatus: () => true
    });

    const html = response.data;
    const status = response.status;

    if (status !== 200) {
      throw new Error(`Gagal fetch halaman, status code: ${status}`);
    }

    const $ = cheerio.load(html);
    const articles = [];

    $(".td-big-grid-wrapper .td-module-thumb").each((i, el) => {
      const url = $(el).find("a").attr("href");
      const image = $(el).find("img").attr("src") || $(el).find("img").attr("data-src");
      const title = $(el).find("img").attr("title") || $(el).find("a").attr("title");
      if (url && title) {
        articles.push({ url, image, title, categories: [] });
      }
    });

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
    console.error("❌ Scraping error:", error.message);
    throw new Error("Gagal mengambil berita bola.");
  }
}
