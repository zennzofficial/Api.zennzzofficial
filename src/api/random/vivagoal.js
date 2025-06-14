const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

async function fetchBeritaBolaRSS() {
  const { data, status } = await axios.get("https://vivagoal.com/category/berita-bola/feed/", {
    timeout: 20000,
    httpsAgent: agent,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/rss+xml,application/xml"
    }
  });

  if (status !== 200) throw new Error("Gagal fetch RSS, status: " + status);

  const $ = cheerio.load(data, { xmlMode: true });
  const items = $("item").toArray();

  if (!items.length) throw new Error("RSS kosong atau struktur berubah");

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
      // Tampilkan error detail di response (buat debug, nanti bisa dihapus)
      res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: "Gagal mengambil berita bola",
        error: e.message
      });
    }
  });
};
