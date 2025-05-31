const cheerio = require("cheerio");
const axios = require("axios");

const CREATOR_NAME = "ZenzXD";
const REQUEST_TIMEOUT = 20000; // Timeout 20 detik

async function pinterestSearch(query) {
  const searchUrl = "https://www.pinterest.com/search/pins/";
  console.log(`[PinterestSearch] Mencari untuk query: "${query}" di URL: ${searchUrl}?q=${encodeURIComponent(query)}`);

  try {
    const { data } = await axios.get(searchUrl, {
      params: { q: query }, // Axios akan otomatis encode
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        "Referer": "https://www.google.com/"
      },
      timeout: REQUEST_TIMEOUT
    });

    // Log sebagian kecil dari HTML untuk diagnosis
    console.log("[PinterestSearch] Snippet HTML diterima (awal 2KB):", data ? data.substring(0, 2000) : "Data HTML kosong/null");
    if (!data) {
        throw new Error("Tidak ada data HTML yang diterima dari Pinterest.");
    }

    const $ = cheerio.load(data);
    const results = new Set();

    // Mencoba beberapa selector umum untuk pin dan gambar di dalamnya
    // Sesuaikan selector ini jika struktur Pinterest berubah
    $('div[data-test-id="pin"] img, div[data-test-id="pin-visual-wrapper"] img, div[role="listitem"] img, img').each((_, imgElement) => {
      const img = $(imgElement);
      let src = img.attr("src") || img.attr("data-src"); // Prioritaskan src, lalu data-src

      // Terkadang URL ada di srcset, ambil yang terbesar jika ada
      const srcset = img.attr("srcset");
      if (!src && srcset) {
        const sources = srcset.split(',').map(s => {
          const parts = s.trim().split(' ');
          return { url: parts[0], width: parseInt(parts[1]?.replace('w', ''), 10) || 0 };
        });
        if (sources.length > 0) {
          sources.sort((a, b) => b.width - a.width); // Urutkan dari lebar terbesar
          src = sources[0].url;
        }
      }
      
      if (src && typeof src === 'string' && src.includes("i.pinimg.com")) {
        // Logika upgrade resolusi yang lebih hati-hati
        let upgradedSrc = src;
        if (src.includes('/150x150/')) { // Resolusi sangat kecil, coba upgrade signifikan
            upgradedSrc = src.replace(/\/[0-9a-zA-Z]+x([0-9a-zA-Z_]*)?\//, '/originals/');
        } else {
            upgradedSrc = src.replace(/\/[0-9a-zA-Z]+x([0-9a-zA-Z_]*)?\//, '/736x/');
        }

        // Fallback jika replace ke originals/736x menghilangkan i.pinimg.com atau gagal total
        if (!upgradedSrc.includes("i.pinimg.com") || upgradedSrc === src.replace(/\/[0-9a-zA-Z]+x([0-9a-zA-Z_]*)?\//, '/originals/') && upgradedSrc === src.replace(/\/[0-9a-zA-Z]+x([0-9a-zA-Z_]*)?\//, '/736x/')) {
             upgradedSrc = src.replace(/236x|474x|564x/g, "736x"); // Metode lama yang lebih aman
        }
        results.add(upgradedSrc);
      }
    });
    
    const uniqueResults = Array.from(results);
    console.log(`[PinterestSearch] Ditemukan ${uniqueResults.length} gambar (setelah filter & upgrade) untuk query "${query}".`);

    if (uniqueResults.length === 0) {
        console.warn(`[PinterestSearch] Tidak ada gambar ditemukan untuk "${query}". Periksa snippet HTML di log. Mungkin halaman berubah, tidak ada hasil, atau perlu login/CAPTCHA.`);
    }

    return {
      status: true,
      creator: CREATOR_NAME,
      result: uniqueResults
    };

  } catch (e) {
    console.error("[PinterestSearch] Terjadi Error:", e.message);
    if (e.response) {
        console.error("[PinterestSearch] Axios Error Status:", e.response.status);
    }
    
    let errorMessage = "Gagal mencari gambar di Pinterest.";
    if (e.isAxiosError && e.message.toLowerCase().includes('timeout')) {
        errorMessage = "Timeout saat menghubungi Pinterest.";
    } else if (e.message) {
        // Jangan sertakan seluruh e.message jika terlalu teknis untuk klien
        errorMessage = e.message.startsWith("Tidak ada data HTML") ? e.message : "Terjadi masalah saat mengambil data dari Pinterest.";
    }

    return {
      status: false,
      creator: CREATOR_NAME,
      message: errorMessage
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
    
    const httpStatusCode = result.status ? 200 : 502;
    res.status(httpStatusCode).json(result);
  });
};
