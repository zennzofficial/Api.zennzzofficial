const axios = require("axios");
const cheerio = require("cheerio");

module.exports = function (app) {
  // Route: /downloader/facebook
  app.get("/downloader/facebook", async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Masukkan parameter ?url= dengan link video Facebook"
      });
    }

    try {
      // POST ke endpoint AJAX Snapsave
      const { data } = await axios.post(
        "https://snapsave.app/action.php",
        new URLSearchParams({
          url: url,
          lang: "id"
        }),
        {
          headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "x-requested-with": "XMLHttpRequest",
            "origin": "https://snapsave.app",
            "referer": "https://snapsave.app/id"
          }
        }
      );

      // Parsing HTML hasil response
      const $ = cheerio.load(data);
      const title = $(".download-title").text().trim() || $("title").text().trim();
      const thumbnail = $(".download-cover img").attr("src") || "";
      const links = [];

      $(".download-items .download-item").each((i, el) => {
        const quality = $(el).find(".download-item__label").text().trim();
        const type = $(el).find(".download-item__type").text().trim();
        const size = $(el).find(".download-item__size").text().trim();
        const link = $(el).find("a").attr("href");
        if (link) {
          links.push({ quality, type, size, link });
        }
      });

      if (!links.length) {
        return res.status(404).json({
          status: false,
          message: "Gagal mengambil link download. Pastikan URL valid dan bisa diakses Snapsave."
        });
      }

      res.json({
        status: true,
        creator: "ZenzzXD",
        result: {
          title,
          thumbnail,
          links
        }
      });
    } catch (e) {
      res.status(500).json({
        status: false,
        message: "Gagal scrape Snapsave",
        error: e.message
      });
    }
  });
};
