const axios = require('axios');

const CREATOR_NAME = "ZenzXD";
const REQUEST_TIMEOUT = 25000; // Timeout untuk request (25 detik)

// --- Fungsi Helper ---
async function getCookies() {
  console.log("[Pinterest Service] Mencoba mengambil cookies...");
  try {
    const response = await axios.get('https://www.pinterest.com/csrf_error/', { timeout: REQUEST_TIMEOUT });
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      const cookies = setCookieHeaders.map(cookieString => cookieString.split(';')[0].trim());
      const cookieString = cookies.join('; ');
      console.log("[Pinterest Service] Cookies berhasil diambil.");
      return cookieString;
    } else {
      console.warn('[Pinterest Service] Tidak ada header set-cookie yang ditemukan.');
      throw new Error('Gagal mengambil cookies dari Pinterest (tidak ada set-cookie).');
    }
  } catch (error) {
    console.error('[Pinterest Service] Error saat mengambil cookies:', error.message);
    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
        throw new Error(`Timeout saat mengambil cookies dari Pinterest: ${error.message}`);
    }
    throw new Error(`Gagal mengambil cookies dari Pinterest: ${error.message}`);
  }
}

// --- Fungsi Service Utama untuk Pencarian ---
async function pinterestSearchAPI(query) {
    console.log(`[Pinterest Search Service] Mencari query: "${query}"`);
    const cookies = await getCookies(); // Jika ini gagal, error akan dilempar dan ditangkap oleh route handler

    const apiUrl = 'https://www.pinterest.com/resource/BaseSearchResource/get/';
    const params = {
        source_url: `/search/pins/?q=${encodeURIComponent(query)}&rs=typed`,
        data: JSON.stringify({
            "options": {
                "isPrefetch": false,
                "query": query,
                "scope": "pins",
                "no_fetch_context_on_resource": false,
            },
            "context": {}
        }),
        _: Date.now()
    };

    const headers = {
        'accept': 'application/json, text/javascript, */*, q=0.01',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-US,en;q=0.9,id;q=0.8',
        'cookie': cookies,
        'referer': `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
        'x-app-version': 'dee1579', // <<< PERHATIAN: Nilai ini sangat mungkin perlu diupdate!
        'x-pinterest-appstate': 'active',
        'x-requested-with': 'XMLHttpRequest'
    };

    console.log(`[Pinterest Search Service] Request ke BaseSearchResource untuk query: "${query}"`);
    try {
        const { data } = await axios.get(apiUrl, {
            headers: headers,
            params: params, // Axios akan meng-encode params dengan benar
            timeout: REQUEST_TIMEOUT
        });

        if (!data || !data.resource_response || !data.resource_response.data || !data.resource_response.data.results) {
            console.warn('[Pinterest Search Service] Format respons tidak sesuai atau tidak ada hasil:', data);
            throw new Error('Format respons tidak sesuai atau tidak ada hasil dari Pinterest.');
        }

        const results = data.resource_response.data.results;
        const validResults = results.filter(v => v.id && v.images?.orig?.url && v.pinner); 
        
        console.log(`[Pinterest Search Service] Ditemukan ${validResults.length} hasil valid untuk query "${query}".`);

        const container = validResults.map((result) => ({
            id: result.id,
            title: result.grid_title || result.title || "",
            // ... (mapping data lainnya seperti yang sudah ada) ...
            image_original_url: result.images.orig.url,
            image_736x_url: result.images['736x']?.url || result.images.orig.url,
            pinner: {
                username: result.pinner.username,
                full_name: result.pinner.full_name,
                avatar_url: result.pinner.image_small_url,
                profile_url: `https://www.pinterest.com/${result.pinner.username}/`,
            },
            source_url: `https://www.pinterest.com/pin/${result.id}/`,
        }));

        return container;
    } catch (error) {
        console.error(`[Pinterest Search Service] Error saat mencari query "${query}":`, error.message);
        if (error.response) {
            console.error("[Pinterest Search Service] Response status:", error.response.status);
            // console.error("[Pinterest Search Service] Response data:", error.response.data); // Hati-hati jika besar
        }
        if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
            throw new Error(`Timeout saat mencari di Pinterest: ${error.message}`);
        }
        throw new Error(`Gagal mencari di Pinterest: ${error.message}`);
    }
}

// --- Mendaftarkan Rute ke Instance Aplikasi Express ---
module.exports = function(app) {
    app.get("/search/pinterest", async (req, res) => {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({
          status: false,
          creator: CREATOR_NAME,
          message: "Parameter query 'q' wajib diisi."
        });
      }
      try {
        console.log(`[API /search/pinterest] Menerima permintaan untuk query: ${q}`);
        const searchResults = await pinterestSearchAPI(q.trim());
        res.json({
          status: true,
          creator: CREATOR_NAME,
          result: searchResults
        });
      } catch (error) {
        console.error(`[API /search/pinterest] Error: ${error.message}`);
        let statusCode = 500;
        let message = error.message || "Terjadi kesalahan internal server.";

        if (error.message.toLowerCase().includes("timeout")) statusCode = 504;
        else if (error.message.includes("gagal mengambil cookies") || error.message.includes("pihak ketiga") || error.message.includes("respons tidak sesuai")) statusCode = 502;
        else if (error.message.includes("tidak ditemukan")) statusCode = 404;
        
        res.status(statusCode).json({
          status: false,
          creator: CREATOR_NAME,
          message: message
        });
      }
    });

    // Anda bisa menghapus atau mengomentari endpoint /downloader/pinterest jika fokus hanya pada search
    // Atau biarkan jika Anda juga membutuhkannya. Kode pindlService dan isPin akan tetap ada di file ini.
    /*
    const { pindlService } = require('./nama_file_ini_jika_dipisah'); // Jika dipisah
    app.get("/downloader/pinterest", async (req, res) => {
        // ... (kode untuk downloader/pinterest seperti sebelumnya)
    });
    */
};
