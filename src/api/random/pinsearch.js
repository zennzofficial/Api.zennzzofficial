const axios = require("axios");

const PINTEREST_TIMEOUT = 20000;
const PINTEREST_VERSION = "dee1579"; // Bisa diganti jika error 403

async function getPinterestCookies() {
  try {
    const response = await axios.get("https://www.pinterest.com/login/", {
      timeout: PINTEREST_TIMEOUT,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      }
    });

    const setCookie = response.headers["set-cookie"];
    if (!setCookie || !setCookie.length) throw new Error("Tidak ada set-cookie");

    return setCookie.map(v => v.split(";")[0]).join("; ");
  } catch (err) {
    throw new Error("Gagal mengambil cookie Pinterest: " + err.message);
  }
}

async function pinterestSearch(query) {
  if (!query) {
    return {
      status: false,
      message: "Parameter 'query' wajib diisi"
    };
  }

  try {
    const cookies = await getPinterestCookies();

    const url = "https://www.pinterest.com/resource/BaseSearchResource/get/";
    const params = {
      source_url: `/search/pins/?q=${encodeURIComponent(query)}&rs=typed`,
      data: JSON.stringify({
        options: {
          isPrefetch: false,
          query,
          scope: "pins",
          no_fetch_context_on_resource: false,
        },
        context: {}
      }),
      _: Date.now()
    };

    const headers = {
      "Accept": "application/json, text/javascript, */*, q=0.01",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      "Cookie": cookies,
      "Referer": `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      "X-App-Version": PINTEREST_VERSION,
      "X-Pinterest-AppState": "active",
    };

    const { data } = await axios.get(url, { headers, params, timeout: PINTEREST_TIMEOUT });

    const results = data?.resource_response?.data?.results || [];
    const valid = results.filter(r => r.id && r.images?.orig?.url && r.pinner);

    const mapped = valid.map(r => ({
      id: r.id,
      caption: r.grid_title || r.title || "",
      image_original: r.images.orig.url,
      image_736x: r.images["736x"]?.url || r.images.orig.url,
      uploader: {
        username: r.pinner.username || "-",
        full_name: r.pinner.full_name || "-",
        avatar: r.pinner.image_small_url || null,
        profile: `https://www.pinterest.com/${r.pinner.username}/`
      },
      source: `https://www.pinterest.com/pin/${r.id}/`
    }));

    return {
      status: true,
      query,
      total: mapped.length,
      result: mapped
    };
  } catch (err) {
    return {
      status: false,
      message: "Gagal mengambil data dari Pinterest",
      error: err.message
    };
  }
}

module.exports = function (app) {
  app.get("/search/pinterest", async (req, res) => {
    const { query } = req.query;
    const result = await pinterestSearch(query?.trim());
    res.status(result.status ? 200 : 500).json(result);
  });
};
