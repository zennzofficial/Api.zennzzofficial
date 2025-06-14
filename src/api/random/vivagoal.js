const axios = require("axios");
const xml2js = require("xml2js");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

async function fetchBeritaBolaRSS() {
  const { data } = await axios.get(
    "https://vivagoal.com/category/berita-bola/feed/",
    {
      timeout: 20000,
      httpsAgent: agent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    }
  );

  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
  const result = await parser.parseStringPromise(data);
  const items = result.rss.channel.item;
  const list = Array.isArray(items) ? items : [items];

  return list.map(item => ({
    title: item.title,
    link: item.link,
    published: item.pubDate,
    thumbnail: item["media:content"]?.url || item.enclosure?.url || null
  }));
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
