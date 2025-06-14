const axios = require("axios");
const cheerio = require("cheerio");

async function fetchBeritaBolaRSS() {
  const { data } = await axios.get(
    "https://vivagoal.com/category/berita-bola/feed/",
    { timeout: 20000 }
  );
  const $ = cheerio.load(data, { xmlMode: true });
  const result = [];

  $("item").each((_, el) => {
    result.push({
      title: $(el).find("title").text(),
      link: $(el).find("link").text(),
      published: $(el).find("pubDate").text(),
      thumbnail: $(el).find("media\\:content, content").attr("url") || null
    });
  });

  return result;
}

module.exports = function(app) {
  app.get("/tools/berita-bola", async (req, res) => {
    try {
      const articles = await fetchBeritaBolaRSS();

      if (!articles.length) {
        return res.status(502).json({
          status: false,
          creator: "ZenzzXD",
          message: "Tidak ada artikel ditemukan dari RSS."
        });
      }

      res.json({
        status: true,
        creator: "ZenzzXD",
        count: articles.length,
        result: articles
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: "Gagal mengambil berita bola via RSS",
        error: err.message
      });
    }
  });
};
