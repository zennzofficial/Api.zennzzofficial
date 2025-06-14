const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const app = express();
const port = process.env.PORT || 3000;
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

app.get("/tools/berita-bola", async (req, res) => {
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

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
