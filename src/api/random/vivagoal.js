const axios = require("axios");
const cheerio = require("cheerio");

async function fetchBeritaBola() {
  const url = "https://vivagoal.com/category/berita-bola/";
  const { data } = await axios.get(url, { timeout: 10000 });
  const $ = cheerio.load(data);

  const articles = [];

  $(".jeg_post").each((i, el) => {
    const titleEl = $(el).find(".jeg_post_title a");
    const title = titleEl.text().trim();
    const link = titleEl.attr("href");
    const meta = $(el).find(".jeg_meta_date").text().trim();
    const author = $(el).find(".jeg_meta_author a").text().trim();
    const thumbEl = $(el).find(".thumb .attachment-thumbnail img");
    const thumbnail = thumbEl.attr("data-src") || thumbEl.attr("src");

    if (title && link) {
      articles.push({ title, link, thumbnail, author, published: meta });
    }
  });

  return articles;
}

module.exports = function(app) {
  app.get("/tools/berita-bola", async (req, res) => {
    try {
      const list = await fetchBeritaBola();
      if (list.length === 0) {
        return res.status(502).json({
          status: false,
          creator: "ZenzzXD",
          message: "Tidak ada artikel ditemukan atau struktur HTML berubah."
        });
      }

      res.json({
        status: true,
        creator: "ZenzzXD",
        count: list.length,
        result: list
      });
    } catch (err) {
      console.error("Scrape error:", err.message);
      res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: "Gagal mengambil berita bola",
        error: err.message
      });
    }
  });
};
