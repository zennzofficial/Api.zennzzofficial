const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

async function fetchBeritaBolaRSS() {
  const { data } = await axios.get("https://vivagoal.com/category/berita-bola/feed/", {
    timeout: 20000,
    httpsAgent: agent,
  });

  const $ = cheerio.load(data, { xmlMode: true });
  const items = $("item").toArray();

  const result = items.map((el) => {
    const title = $(el).find("title").text();
    const link = $(el).find("link").text();
    const published = $(el).find("pubDate").text();

    return { title, link, published };
  });

  return result;
}

module.exports = function (app) {
  app.get("/berita/berita-bola", async (req, res) => {
    try {
      const result = await fetchBeritaBolaRSS();
      res.json({
        status: true,
        creator: "ZenzzXD",
        count: result.length,
        result,
      });
    } catch (e) {
      res.status(500).json({
        status: false,
        message: "Gagal mengambil berita bola",
      });
    }
  });
};
