const axios = require("axios");

async function getCookies() {
  try {
    const res = await axios.get("https://www.pinterest.com/csrf_error/");
    const cookies = res.headers["set-cookie"];
    if (!cookies) return null;
    return cookies.map(c => c.split(";")[0].trim()).join("; ");
  } catch (err) {
    return null;
  }
}

async function pinterestSearch(query) {
  try {
    const cookies = await getCookies();
    if (!cookies) throw new Error("Gagal mengambil cookies");

    const url = "https://www.pinterest.com/resource/BaseSearchResource/get/";
    const params = {
      source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
      data: JSON.stringify({
        options: {
          isPrefetch: false,
          query,
          scope: "pins",
          no_fetch_context_on_resource: false
        },
        context: {}
      }),
      _: Date.now()
    };

    const headers = {
      "accept": "application/json, text/javascript, */*, q=0.01",
      "cookie": cookies,
      "referer": `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "x-app-version": "c056fb7",
      "x-pinterest-appstate": "active",
      "x-requested-with": "XMLHttpRequest"
    };

    const { data } = await axios.get(url, { headers, params });

    const results = data?.resource_response?.data?.results?.filter(v => v.images?.orig) || [];
    return results.map(v => ({
      upload_by: v.pinner?.username || "",
      fullname: v.pinner?.full_name || "",
      followers: v.pinner?.follower_count || 0,
      caption: v.grid_title || "",
      image: v.images.orig.url,
      source: `https://www.pinterest.com/pin/${v.id}/`
    }));
  } catch (err) {
    throw new Error(err.message);
  }
}

module.exports = function (app) {
  app.get("/search/pinterest", async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'q' wajib diisi. Contoh: /search/pinterest?q=kucing lucu"
      });
    }

    try {
      const result = await pinterestSearch(q);
      if (!result.length) {
        return res.status(404).json({
          status: false,
          message: "Tidak ada hasil ditemukan untuk query tersebut"
        });
      }

      res.json({
        status: true,
        creator: "ZenzXD",
        result
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: "Gagal mengambil data",
        error: err.message
      });
    }
  });
};
