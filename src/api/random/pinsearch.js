const axios = require("axios");

async function getCookies() {
  try {
    const response = await axios.get("https://www.pinterest.com");
    const setCookieHeaders = response.headers["set-cookie"];
    if (setCookieHeaders) {
      const cookies = setCookieHeaders.map(cookie => cookie.split(";")[0].trim());
      return cookies.join("; ");
    }
    return null;
  } catch {
    return null;
  }
}

async function pinterestSearch(query) {
  try {
    const cookies = await getCookies();
    if (!cookies) throw new Error("Gagal mengambil cookies");

    const url = "https://www.pinterest.com/resource/BaseSearchResource/get/";
    const params = {
      source_url: `/search/pins/?q=${query}`,
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
      cookie: cookies,
      referer: "https://www.pinterest.com/",
      "user-agent": "Mozilla/5.0",
      "x-app-version": "c056fb7",
      "x-pinterest-appstate": "active",
      "x-pinterest-pws-handler": "www/[username]/[slug].js",
      "x-pinterest-source-url": "/search/pins/",
      "x-requested-with": "XMLHttpRequest"
    };

    const { data } = await axios.get(url, { headers, params });
    const results = data.resource_response?.data?.results || [];
    const filtered = results.filter(v => v.images?.orig);

    return filtered.map(result => ({
      upload_by: result.pinner?.username || "-",
      fullname: result.pinner?.full_name || "-",
      followers: result.pinner?.follower_count || 0,
      caption: result.grid_title || "",
      image: result.images.orig.url,
      source: `https://id.pinterest.com/pin/${result.id}`
    }));
  } catch (err) {
    throw new Error(err.message || "Unknown error");
  }
}

module.exports = function (app) {
  app.get("/search/pinterest", async (req, res) => {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'query' wajib diisi"
      });
    }

    try {
      const result = await pinterestSearch(query);
      res.json({
        status: true,
        total: result.length,
        query,
        result
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: "Terjadi kesalahan",
        error: err.message
      });
    }
  });
};
