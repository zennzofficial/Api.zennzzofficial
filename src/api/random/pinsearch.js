const cheerio = require("cheerio");
const axios = require("axios");

const CREATOR_NAME = "ZenzXD"; // Pastikan ini sesuai dengan setting Anda
const REQUEST_TIMEOUT = 15000; // Timeout 15 detik untuk request

async function pinterestSearch(query) {
  const searchUrl = "https://www.pinterest.com/search/pins/";
  console.log(`[PinterestSearch] Mencari untuk query: "${query}" di URL: ${searchUrl}?q=${query}`);

  try {
    const { data } = await axios.get(searchUrl, {
      params: { q: query },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8", // Menambahkan preferensi bahasa Indonesia juga
        "Referer": "https://www.google.com/" // Menambahkan referer umum
      },
      timeout: REQUEST_TIMEOUT
    });

    const $ = cheerio.load(data);
    const results = new Set(); // Menggunakan Set untuk otomatis menangani duplikasi URL

    // Mencoba selector yang lebih spesifik jika memungkinkan,
    // namun untuk Pinterest, seringkali gambar ada di dalam banyak div.
    // Kita akan tetap menggunakan img tag dan filter berdasarkan domain,
    // karena ini cara yang cukup umum untuk mengambil gambar pin awal.
    $('img[src*="i.pinimg.com"]').each((_, img) => {
      let src = $(img).attr("src");
      if (src) {
        // Mencoba upgrade resolusi ke 'originals' atau '736x'
        // Pola umum: /<dimensi>x/... -> /originals/... atau /736x/...
        // Contoh: /236x/ -> /originals/
        // Contoh: /474x/ -> /originals/
        let upgradedSrc = src.replace(/\/[0-9a-zA-Z]+x\//, '/originals/'); // Coba 'originals' dulu
        if (upgradedSrc === src) { // Jika tidak ada perubahan (mungkin sudah originals atau pola beda)
            upgradedSrc = src.replace(/\/[0-9a-zA-Z]+x\//, '/736x/'); // Coba '736x'
        }
        // Jika masih sama, mungkin sudah resolusi tinggi atau pola tidak cocok. Gunakan src asli.
        // Untuk kesederhanaan, kita ambil saja hasil replace jika berhasil, atau src asli jika tidak.
        // Heuristik yang lebih sederhana:
        src = src.replace(/236x|474x|564x/g, "736x"); // Tetap gunakan ini jika 'originals' terlalu agresif/tidak selalu ada

        results.add(src);
      }
    });
    
    const uniqueResults = Array.from(results);
    console.log(`[PinterestSearch] Ditemukan ${uniqueResults.length} gambar untuk query "${query}".`);

    if (uniqueResults.length === 0) {
        // Bisa jadi karena query tidak menghasilkan apa-apa, atau Pinterest memblokir/mengubah halaman
        console.warn(`[PinterestSearch] Tidak ada gambar ditemukan untuk "${query}". Mungkin halaman berubah atau tidak ada hasil.`);
    }

    return {
      status: true,
      creator: CREATOR_NAME,
      result: uniqueResults
    };

  } catch (e) {
    console.error("[PinterestSearch] Error:", e.message);
    // Log detail error dari Axios jika ada
    if (e.response) {
        console.error("[PinterestSearch] Axios Response Error Status:", e.response.status);
        // console.error("[PinterestSearch] Axios Response Error Data:", e.response.data); // Hati-hati jika datanya besar
    } else if (e.request) {
        console.error("[PinterestSearch] Axios Request Error (No Response):", e.request);
    }
    
    let errorMessage = "Gagal mencari gambar di Pinterest.";
    if (e.isAxiosError && e.message.toLowerCase().includes('timeout')) {
        errorMessage = "Timeout saat menghubungi Pinterest.";
    } else if (e.message) {
        errorMessage = e.message;
    }

    return {
      status: false,
      creator: CREATOR_NAME,
      message: errorMessage,
      // error_detail: e.message // Bisa ditambahkan jika perlu untuk debugging klien, tapi hati-hati membocorkan info internal
    };
  }
}

// --- Integrasi ke Express App ---
module.exports = function (app) {
  app.get("/search/pinterest", async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        status: false,
        creator: CREATOR_NAME,
        message: "Parameter query 'q' wajib diisi."
      });
    }

    console.log(`[API /search/pinterest] Menerima permintaan untuk query: ${q}`);
    const result = await pinterestSearch(q.trim());
    
    // Jika scraper gagal (status: false), kembalikan 502 Bad Gateway
    // Jika berhasil tapi result array kosong, tetap 200 OK dengan array kosong
    const httpStatusCode = result.status ? 200 : 502;

    res.status(httpStatusCode).json(result);
  });
};
