const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

async function beritabola() {
  try {
    const response = await axios.get("https://vivagoal.com/category/berita-bola/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      validateStatus: () => true // biar tetap jalan meski status bukan 200
    });

    const html = response.data;
    const status = response.status;

    // Save isi HTML-nya untuk dicek
    fs.writeFileSync("vivagoal.html", html);
    console.log(`Status Code: ${status}`);
    
    if (status !== 200) {
      throw new Error(`Gagal fetch halaman, status code: ${status}`);
    }

    const $ = cheerio.load(html);
    const articles = [];

    // Fix selector headline
    $(".td-big-grid-wrapper .td-module-thumb").each((i, el) => {
      const url = $(el).find("a").attr("href");
      const image = $(el).find("img").attr("src") || $(el).find("img").attr("data-src");
      const title = $(el).find("img").attr("title") || $(el).find("a").attr("title");
      if (url && title) {
        articles.push({
          url,
          image,
          title,
          categories: []
        });
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
        articles.push({
          url,
          image,
          title,
          categories
        });
      }
    });

    return articles;
  } catch (error) {
    console.error("❌ Scraping error:", error.message);
    throw new Error("Gagal mengambil berita bola.");
  }
}

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
