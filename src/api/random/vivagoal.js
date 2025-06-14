const axios = require("axios");

async function fetchBeritaBolaRSS() {
  const url = encodeURIComponent("https://vivagoal.com/category/berita-bola/feed/");
  const { data } = await axios.get(`https://api.rss2json.com/v1/api.json?rss_url=${url}`);
  if (!data.items || !data.items.length) throw new Error("RSS kosong atau gagal diambil");

  const result = data.items.map(item => ({
    title: item.title,
    link: item.link,
    published: item.pubDate
  }));

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
        creator: "ZenzzXD",
        message: "Gagal mengambil berita bola",
        error: e.message
      });
    }
  });
};
