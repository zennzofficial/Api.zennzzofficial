const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

// Mengatasi error SSL (certificate)
const agent = new https.Agent({
  rejectUnauthorized: false,
});

async function fetchBeritaBola() {
  const url = "https://vivagoal.com/category/berita-bola/";
  const { data } = await axios.get(url, {
    timeout: 10000,
    httpsAgent: agent,
  });

  const $ = cheerio.load(data);
  const result = [];

  $(".jeg_post").each((_, el) => {
    const title = $(el).find(".jeg_post_title a").text().trim();
    const link = $(el).find(".jeg_post_title a").attr("href");
    const published = $(el).find(".jeg_meta_date").text().trim();
    const author = $(el).find(".jeg_meta_author a").text().trim();
    const thumb =
      $(el).find(".thumb img").attr("data-src") ||
      $(el).find(".thumb img").attr("src");

    if (title && link) {
      result.push({ title, link, thumbnail: thumb, author, published });
    }
  });

  return result;
}

module.exports = function (app) {
  app.get("/tools/berita-bola", async (req, res) => {
    try {
      const articles = await fetchBeritaBola();

      if (!articles.length) {
        return res.status(502).json({
          status: false,
          creator: "ZenzzXD",
          message: "Tidak ada artikel ditemukan atau struktur HTML berubah.",
        });
      }

      res.json({
        status: true,
        creator: "ZenzzXD",
        count: articles.length,
        result: articles,
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: "Gagal mengambil berita bola",
        error: err.message,
      });
    }
  });
};
