const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

async function fetchBeritaBolaRSS() {
  const { data } = await axios.get(
    "https://vivagoal.com/category/berita-bola/feed/",
    {
      timeout: 20000,
      httpsAgent: agent
    }
  );

  const $ = cheerio.load(data, { xmlMode: true });
  const result = [];

  $("item").each((_, el) => {
    const title = $(el).find("title").first().text();
    const link = $(el).find("link").first().text();
    const published = $(el).find("pubDate").first().text();

    // Ambil thumbnail dari media:content atau enclosure
    let thumbnail = null;
    const mediaContent = $(el).find("media\\:content");
    const enclosure = $(el).find("enclosure");

    if (mediaContent.length && mediaContent.attr("url")) {
      thumbnail = mediaContent.attr("url");
    } else if (enclosure.length && enclosure.attr("url")) {
      thumbnail = enclosure.attr("url");
    }

    result.push({ title, link, published, thumbnail });
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
