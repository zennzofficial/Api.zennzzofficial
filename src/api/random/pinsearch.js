const axios = require("axios");

// --- Konstanta dan Fungsi Helper ---
const CREATOR_NAME = "ZenzXD"; // Tambahkan jika ingin dipakai di respons
const REQUEST_TIMEOUT = 20000; // Timeout 20 detik untuk request

// Fungsi untuk mendapatkan cookies, dengan penanganan error yang lebih baik
async function getPinterestCookies() {
  console.log("[Pinterest Cookie] Mencoba mengambil cookies...");
  try {
    // Menggunakan URL yang lebih umum dikenal untuk mendapatkan cookies awal
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
    // Daripada null, lebih baik throw error agar ditangani oleh catch block utama
    throw new Error("Gagal mengambil cookies: Tidak ada header 'set-cookie'.");
  } catch (error) {
    console.error("[Pinterest Cookie] Error saat mengambil cookies:", error.message);
    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
        throw new Error(`Timeout saat mengambil cookies dari Pinterest: ${error.message}`);
    }
    throw new Error(`Gagal mengambil cookies dari Pinterest: ${error.message}`);
  }
}

// Fungsi utama untuk pencarian Pinterest
async function pinterestSearchService(query) {
  console.log(`[Pinterest Search] Mencari untuk query: "${query}"`);
  try {
    const cookies = await getPinterestCookies();
    // Tidak perlu cek '!cookies' di sini karena getPinterestCookies akan throw error jika gagal

    const searchApiUrl = "https://www.pinterest.com/resource/BaseSearchResource/get/";
    const searchParams = {
      source_url: `/search/pins/?q=${encodeURIComponent(query)}&rs=typed`, // Pastikan query di-encode
      data: JSON.stringify({
        options: {
          isPrefetch: false,
          query: query, // Query asli
          scope: "pins",
          no_fetch_context_on_resource: false,
          // "page_size": 25, // Opsional: Anda bisa coba tambahkan parameter ini
          // "bookmarks": ["PAGINATION_BOOKMARK_CURSOR"], // Untuk pagination jika ada
        },
        context: {}
      }),
      _: Date.now()
    };

    const searchHeaders = {
      "Accept": "application/json, text/javascript, */*, q=0.01",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      "Cookie": cookies,
      "Referer": `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", // UA Browser umum
      "X-Requested-With": "XMLHttpRequest",
      "X-App-Version": "dee1579", // PERHATIAN: Nilai ini sangat rentan berubah!
      "X-Pinterest-AppState": "active",
      // Header berikut mungkin opsional atau bisa digeneralisasi
      // "x-pinterest-pws-handler": "www/[username]/[slug].js", // Lebih baik dihapus jika tidak tahu cara mengisinya dinamis
      // "x-pinterest-source-url": `/search/pins/?q=${encodeURIComponent(query)}&rs=typed`, // Bisa disesuaikan
    };

    console.log(`[Pinterest Search] Mengirim request ke ${searchApiUrl} dengan params dan headers.`);
    const { data } = await axios.get(searchApiUrl, {
      headers: searchHeaders,
      params: searchParams, // Axios akan meng-handle serialisasi params
      timeout: REQUEST_TIMEOUT
    });

    // Log respons mentah dari Pinterest (sebagian kecil untuk debugging)
    // console.log("[Pinterest Search] Respons mentah (sebagian):", JSON.stringify(data)?.substring(0, 500));

    if (!data || !data.resource_response || !data.resource_response.data) {
      console.warn("[Pinterest Search] Struktur respons tidak sesuai atau data kosong:", data);
      throw new Error("Struktur respons dari Pinterest tidak sesuai atau data kosong.");
    }
    
    const results = data.resource_response.data.results || [];
    const filteredResults = results.filter(v => v.id && v.images?.orig?.url && v.pinner); // Filter lebih awal untuk efisiensi

    console.log(`[Pinterest Search] Ditemukan ${filteredResults.length} hasil valid untuk query "${query}".`);

    return filteredResults.map(result => ({
      id: result.id, // Tambahkan ID pin
      upload_by: result.pinner.username || "-",
      fullname: result.pinner.full_name || "-",
      followers: result.pinner.follower_count || 0,
      caption: result.grid_title || result.title || "", // Ambil title jika grid_title kosong
      image_original: result.images.orig.url,
      image_736x: result.images["736x"]?.url || result.images.orig.url, // Fallback ke original
      // Anda bisa tambahkan resolusi lain jika tersedia di result.images
      source: `https://www.pinterest.com/pin/${result.id}` // Link yang lebih umum
    }));

  } catch (err) {
    console.error(`[Pinterest Search] Error pada proses pencarian untuk "${query}":`, err.message);
    if (err.response) {
        console.error("[Pinterest Search] Error Response Status:", err.response.status);
        // console.error("[Pinterest Search] Error Response Data:", err.response.data); // Hati-hati log data besar
    } else if (err.request && err.code === 'ECONNABORTED') {
        throw new Error(`Timeout saat menghubungi Pinterest: ${err.message}`);
    }
    // Melempar error asli atau pesan yang lebih umum
    throw new Error(err.message || "Terjadi kesalahan saat mencari di Pinterest.");
  }
}

// --- Integrasi ke Express App ---
module.exports = function (app) {
  app.get("/search/pinterest", async (req, res) => {
    const { query } = req.query; // Menggunakan 'query' agar konsisten dengan fungsi service
    if (!query) {
      return res.status(400).json({
        status: false,
        creator: CREATOR_NAME, // Menggunakan konstanta yang sudah ada
        message: "Parameter 'query' wajib diisi."
      });
    }

    try {
      console.log(`[API /search/pinterest] Menerima query: ${query}`);
      const searchResult = await pinterestSearchService(query.trim()); // Panggil fungsi service
      res.json({
        status: true,
        creator: CREATOR_NAME,
        total_results: searchResult.length,
        query: query.trim(),
        result: searchResult
      });
    } catch (err) {
      console.error(`[API /search/pinterest] Gagal memproses permintaan: ${err.message}`);
      let statusCode = 500; // Default server error
      // Pemetaan error yang lebih spesifik
      if (err.message.toLowerCase().includes("timeout")) {
        statusCode = 504; // Gateway Timeout
      } else if (err.message.includes("gagal mengambil cookies") || err.message.includes("struktur respons tidak sesuai") || err.message.includes("pihak ketiga")) {
        statusCode = 502; // Bad Gateway
      } else if (err.message.includes("tidak ditemukan")) { // Jika ada error spesifik 'tidak ditemukan' dari service
        statusCode = 404;
      }

      res.status(statusCode).json({
        status: false,
        creator: CREATOR_NAME,
        message: "Terjadi kesalahan saat mencari gambar di Pinterest.",
        error_detail: err.message // Sertakan detail error untuk debugging (bisa dihapus di produksi)
      });
    }
  });
};
