const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

async function getOgImage(url) {
  try {
    const { data } = await axios.get(url, { httpsAgent: agent, timeout: 10000 });
    const $ = cheerio.load(data);
    return $('meta[property="og:image"]').attr("content") || null;
  } catch {
    return null;
  }
}

async function fetchBeritaBolaRSS() {
  const { data } = await axios.get("https://vivagoal.com/category/berita-bola/feed/", {
    timeout: 20000,
    httpsAgent: agent,
  });

  const $ = cheerio.load(data, { xmlMode: true });
  const items = $("item").toArray();

  const result = await Promise.all(items.map(async (el) => {
    const title = $(el).find("title").text();
    const link = $(el).find("link").text();
    const published = $(el).find("pubDate").text();
    const thumbnail = await getOgImage(link);

    return { title, link, published, thumbnail };
  }));

  return result;
}

module.exports = function (app) {
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
