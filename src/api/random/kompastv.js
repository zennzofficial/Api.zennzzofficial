const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function (app) {
  app.get("/berita/kompas-tv", async (req, res) => {
    try {
      const { data } = await axios.get("https://www.kompas.tv/rss/nasional.xml");
      const $ = cheerio.load(data, { xmlMode: true });

      const items = $("item").map((_, el) => ({
        title: $(el).find("title").text(),
        link: $(el).find("link").text(),
        published: $(el).find("pubDate").text()
      })).get();

      res.json({
        status: true,
        creator: "ZenzzXD",
        count: items.length,
        result: items
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: "Gagal mengambil RSS KompasTV",
        error: err.message
      });
    }
  });
};
