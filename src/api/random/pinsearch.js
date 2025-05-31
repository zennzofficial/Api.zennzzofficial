const cheerio = require("cheerio");
const axios = require("axios");

const CREATOR_NAME = "ZenzXD";

async function pinterestSearch(query) {
  try {
    const { data } = await axios.get("https://www.pinterest.com/search/pins/", {
      params: { q: query },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    const $ = cheerio.load(data);
    const result = [];

    $("img").each((_, img) => {
      let src = $(img).attr("src") || $(img).attr("data-src");
      if (src && src.includes("pinimg.com")) {
        // Upgrade resolusi ke 736
        src = src.replace(/236x|474x/g, "736x");
        if (!result.includes(src)) result.push(src);
      }
    });

    return {
      status: true,
      creator: CREATOR_NAME,
      result
    };

  } catch (e) {
    return {
      status: false,
      creator: CREATOR_NAME,
      message: "Gagal mencari gambar Pinterest",
      error: e.message
    };
  }
}

module.exports = function (app) {
  app.get("/search/pinterest", async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        status: false,
        creator: CREATOR_NAME,
        message: "Parameter 'q' wajib diisi"
      });
    }

    const result = await pinterestSearch(q.trim());
    res.status(result.status ? 200 : 502).json(result);
  });
};
