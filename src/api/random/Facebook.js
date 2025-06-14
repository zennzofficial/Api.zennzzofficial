const axios = require("axios");
const cheerio = require("cheerio");
const { wrapper } = require("axios-cookiejar-support");
const tough = require("tough-cookie");

module.exports = function (app) {
  app.get("/downloader/facebook", async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Masukkan parameter ?url= dengan link video Facebook/Instagram/Tiktok, dll"
      });
    }

    try {
      // Pakai cookie jar biar mirip browser
      const client = wrapper(axios.create({ jar: new tough.CookieJar() }));

      // Kunjungi halaman utama dulu (biar dapet cookie/session)
      await client.get("https://snapsave.app/id", {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
        }
      });

      // POST ke endpoint AJAX Snapsave
      const { data } = await client.post(
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
            "referer": "https://snapsave.app/id",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
          }
        }
      );

      // Debug: cek response asli (uncomment buat debug)
      // console.log(data);

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
          creator: "ZenzzXD",
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
        creator: "ZenzzXD",
        message: "Gagal scrape Snapsave",
        error: e.message
      });
    }
  });
};
