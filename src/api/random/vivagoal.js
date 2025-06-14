const axios = require("axios");
const cheerio = require("cheerio");

async function beritabola() {
  try {
    const { data: html } = await axios.get("https://vivagoal.com/category/berita-bola/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    const $ = cheerio.load(html);
    const articles = [];

    // Headline swiper
    $(".swiper-wrapper .swiper-slide").each((i, el) => {
      const article = {
        url: $(el).find("a").attr("href") || null,
        image: $(el).find("figure img").attr("src") || null,
        title: $(el).find("h3 a").text().trim() || null,
        categories: []
      };
      $(el).find("a.vg_pill_cat").each((i, cat) => {
        article.categories.push($(cat).text().trim());
      });
      if (article.url && article.title) articles.push(article);
    });

    // Artikel biasa
    $(".col-lg-6.mb-4").each((i, el) => {
      const article = {
        url: $(el).find("a").attr("href") || null,
        image: $(el).find("figure img").attr("src") || null,
        title: $(el).find("h3 a").text().trim() || null,
        categories: []
      };
      $(el).find("a.vg_pill_cat").each((i, cat) => {
        article.categories.push($(cat).text().trim());
      });
      if (article.url && article.title) articles.push(article);
    });

    return articles;
  } catch (error) {
    console.error("Terjadi kesalahan saat scraping:", error.message);
    throw new Error("Gagal mengambil berita bola.");
  }
}

// Express Route
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
