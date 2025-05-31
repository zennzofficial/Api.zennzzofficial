const axios = require("axios");

// --- Konstanta dan Fungsi Helper ---
const CREATOR_NAME = "ZenzXD";
const REQUEST_TIMEOUT = 20000;

// ... (fungsi getPinterestCookies dan pinterestSearchService tetap sama seperti yang Anda berikan) ...
async function getPinterestCookies() {
  console.log("[Pinterest Cookie] Mencoba mengambil cookies...");
  try {
    const response = await axios.get("https://www.pinterest.com/login/", {
      timeout: REQUEST_TIMEOUT,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      }
    });
    const setCookieHeaders = response.headers["set-cookie"];
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      const cookies = setCookieHeaders.map(cookie => cookie.split(";")[0].trim());
      const cookieString = cookies.join("; ");
      console.log("[Pinterest Cookie] Cookies berhasil diambil.");
      return cookieString;
    }
    console.warn("[Pinterest Cookie] Tidak ada header 'set-cookie' yang ditemukan.");
    throw new Error("Gagal mengambil cookies: Tidak ada header 'set-cookie'.");
  } catch (error) {
    console.error("[Pinterest Cookie] Error saat mengambil cookies:", error.message);
    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
        throw new Error(`Timeout saat mengambil cookies dari Pinterest: ${error.message}`);
    }
    throw new Error(`Gagal mengambil cookies dari Pinterest: ${error.message}`);
  }
}

async function pinterestSearchService(searchQuery) { // Mengganti nama parameter internal agar jelas
  console.log(`[Pinterest Search] Mencari untuk query: "${searchQuery}"`);
  try {
    const cookies = await getPinterestCookies();

    const searchApiUrl = "https://www.pinterest.com/resource/BaseSearchResource/get/";
    const searchParams = {
      source_url: `/search/pins/?q=${encodeURIComponent(searchQuery)}&rs=typed`,
      data: JSON.stringify({
        options: {
          isPrefetch: false,
          query: searchQuery, // Menggunakan searchQuery
          scope: "pins",
          no_fetch_context_on_resource: false,
        },
        context: {}
      }),
      _: Date.now()
    };

    const searchHeaders = {
      "Accept": "application/json, text/javascript, */*, q=0.01",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      "Cookie": cookies,
      "Referer": `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(searchQuery)}`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      "X-App-Version": "dee1579",
      "X-Pinterest-AppState": "active",
    };

    console.log(`[Pinterest Search] Mengirim request ke ${searchApiUrl} dengan params dan headers.`);
    const { data } = await axios.get(searchApiUrl, {
      headers: searchHeaders,
      params: searchParams,
      timeout: REQUEST_TIMEOUT
    });

    if (!data || !data.resource_response || !data.resource_response.data) {
      console.warn("[Pinterest Search] Struktur respons tidak sesuai atau data kosong:", data);
      throw new Error("Struktur respons dari Pinterest tidak sesuai atau data kosong.");
    }
    
    const results = data.resource_response.data.results || [];
    const filteredResults = results.filter(v => v.id && v.images?.orig?.url && v.pinner);

    console.log(`[Pinterest Search] Ditemukan ${filteredResults.length} hasil valid untuk query "${searchQuery}".`);

    return filteredResults.map(result => ({
      id: result.id,
      upload_by: result.pinner.username || "-",
      fullname: result.pinner.full_name || "-",
      followers: result.pinner.follower_count || 0,
      caption: result.grid_title || result.title || "",
      image_original: result.images.orig.url,
      image_736x: result.images["736x"]?.url || result.images.orig.url,
      source: `https://www.pinterest.com/pin/${result.id}`
    }));

  } catch (err) {
    console.error(`[Pinterest Search] Error pada proses pencarian untuk "${searchQuery}":`, err.message);
    if (err.response) {
        console.error("[Pinterest Search] Error Response Status:", err.response.status);
    } else if (err.request && err.code === 'ECONNABORTED') {
        throw new Error(`Timeout saat menghubungi Pinterest: ${err.message}`);
    }
    throw new Error(err.message || "Terjadi kesalahan saat mencari di Pinterest.");
  }
}


// --- Integrasi ke Express App ---
module.exports = function (app) {
  app.get("/search/pinterest", async (req, res) => {
    const { q } = req.query; // <<< DIUBAH dari 'query' menjadi 'q'
    if (!q) {                // <<< DIUBAH dari '!query' menjadi '!q'
      return res.status(400).json({
        status: false,
        creator: CREATOR_NAME,
        message: "Parameter 'q' wajib diisi." // <<< Pesan disesuaikan
      });
    }

    try {
      console.log(`[API /search/pinterest] Menerima query: ${q}`);
      const searchResult = await pinterestSearchService(q.trim()); // Kirim 'q' ke service
      res.json({
        status: true,
        creator: CREATOR_NAME,
        total_results: searchResult.length,
        query: q.trim(), // Menggunakan 'q' untuk konsistensi di output
        result: searchResult
      });
    } catch (err) {
      console.error(`[API /search/pinterest] Gagal memproses permintaan: ${err.message}`);
      let statusCode = 500;
      if (err.message.toLowerCase().includes("timeout")) {
        statusCode = 504;
      } else if (err.message.includes("gagal mengambil cookies") || err.message.includes("struktur respons tidak sesuai") || err.message.includes("pihak ketiga")) {
        statusCode = 502;
      } else if (err.message.includes("tidak ditemukan")) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        status: false,
        creator: CREATOR_NAME,
        message: "Terjadi kesalahan saat mencari gambar di Pinterest.",
        error_detail: err.message
      });
    }
  });
};
