const axios = require('axios');
const cheerio = require('cheerio');
const { URLSearchParams } = require('url'); // Built-in di Node.js

const PINTEREST_DOWNLOADER_BASEURL = "https://pinterestdownloader.com/ID"; // Atau "/ID" jika lebih stabil

/**
 * Fungsi inti untuk mengambil media dari Pinterest via pinterestdownloader.com
 * @param {string} pinterestUrl - URL Pinterest (pin, board, atau user).
 * @returns {Promise<Array<object>>} Array berisi objek media yang ditemukan.
 */
async function fetchPinterestMedia(pinterestUrl) {
  try {
    // 1. Ambil halaman awal untuk cookies
    console.log(`PinterestDL: GET ${PINTEREST_DOWNLOADER_BASEURL} untuk cookies`);
    const initialResponse = await axios.get(PINTEREST_DOWNLOADER_BASEURL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7'
      },
      timeout: 15000 // 15 detik timeout
    });
    const initialCookies = initialResponse.headers['set-cookie']?.map(x => x.split(';')[0]).join('; ') || '';

    const commonHeaders = {
      "cookie": initialCookies,
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "origin": "https://pinterestdownloader.com",
      "referer": PINTEREST_DOWNLOADER_BASEURL,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
      "x-requested-with": "XMLHttpRequest" // Sering ada di request AJAX
    };

    // 2. POST URL Pinterest untuk memulai proses
    const bodyUrl = new URLSearchParams({ url: pinterestUrl }).toString();
    console.log(`PinterestDL: POST URL ${pinterestUrl} ke ${PINTEREST_DOWNLOADER_BASEURL}`);
    const firstPostResponse = await axios.post(PINTEREST_DOWNLOADER_BASEURL, bodyUrl, { 
        headers: commonHeaders, 
        timeout: 20000 // 20 detik timeout
    });
    
    let htmlContent = firstPostResponse.data;
    let $ = cheerio.load(htmlContent);
    let processId = $('input[name="process_id"]').attr('value');
    
    // Coba regex jika selector gagal, meskipun selector input biasanya lebih stabil
    if (!processId) {
        const processIdMatch = htmlContent.match(/process_id["']?\s*:\s*["']([a-f0-9\-]+)["']/i);
        processId = processIdMatch?.[1];
    }

    // 3. Polling jika ada process_id
    if (processId) {
      console.log(`PinterestDL: Ditemukan process_id: ${processId}. Memulai polling.`);
      let attempts = 0;
      const MAX_POLL_ATTEMPTS = 5; // Maksimal 5 kali polling (total sekitar 15-20 detik)
      const POLL_INTERVAL = 3000; // Tunggu 3 detik antar polling

      for (attempts = 0; attempts < MAX_POLL_ATTEMPTS; attempts++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        console.log(`PinterestDL: Polling attempt ${attempts + 1}/${MAX_POLL_ATTEMPTS}`);
        const pollBody = new URLSearchParams({ process_id: processId }).toString();
        const pollResponse = await axios.post(PINTEREST_DOWNLOADER_BASEURL, pollBody, { 
            headers: commonHeaders, 
            timeout: 5000 // Timeout per poll request
        });
        htmlContent = pollResponse.data;
        $ = cheerio.load(htmlContent); // Muat ulang Cheerio dengan HTML baru
        // Cek apakah pesan "we are working on" atau sejenisnya masih ada
        if (!/we are working on|processing your link|กำลังประมวลผลลิงก์ของคุณ/i.test(htmlContent)) {
          console.log("PinterestDL: Polling selesai, konten diterima.");
          break;
        }
      }
      if (attempts === MAX_POLL_ATTEMPTS && /we are working on|processing your link|กำลังประมวลผลลิงก์ของคุณ/i.test(htmlContent)) {
        throw new Error("Proses di pinterestdownloader.com terlalu lama atau gagal setelah polling maksimal.");
      }
    } else {
      console.log("PinterestDL: Tidak ada process_id, melanjutkan dengan HTML respons pertama.");
    }

    // 4. Parse HTML final untuk link download
    const resultMap = {};

    // Selector untuk gambar (biasanya .download__btn atau sejenisnya)
    $('div.results-container a.download__btn, table.table a.button').each((_, el) => {
      const btn = $(el);
      const href = btn.attr('href');
      const text = btn.text().trim();
      if (!href) return;

      let qualityMatch = text.match(/(HD quality|\d+p|\d{3,4}x\d{3,4}|Gambar Kualitas HD)/i);
      let quality = qualityMatch?.[1]?.replace(/Gambar Kualitas /i, '').replace(/ quality/i, '').toUpperCase() || 
                    text.replace(/Unduh Link|Download Link|Download/i, '').trim().replace(/[\(\)]/g,'') || "standard";
      quality = quality === "" ? "standard" : quality;

      let type = text.toLowerCase().includes('force') ? "force" : "direct";
      let key = `image_${quality.replace(/\s+/g, '_').toLowerCase()}`;
      if (!resultMap[key]) resultMap[key] = { tag: "image", quality };
      resultMap[key][type] = href;
    });

    // Selector untuk video dan GIF (biasanya .download_button atau sejenisnya)
    $('div.buttons a.download_button, div.downloader-section a.download-button').each((_, el) => {
      const btn = $(el);
      const href = btn.attr('href');
      const text = btn.text().trim();
      if (!href) return;

      if (/video|mp4/i.test(text) || (href && href.includes('.mp4'))) {
        let quality = "HD"; // Default
        const qualityMatch = text.match(/(\d+p|HD|Full HD|Video \w+)/i);
        if (qualityMatch && qualityMatch[1]) quality = qualityMatch[1].replace(/Video /i,'').toUpperCase();
        
        let type = text.toLowerCase().includes('force') ? "force" : "direct";
        let key = `video_${quality.replace(/\s+/g, '_').toLowerCase()}`;
        if (!resultMap[key]) resultMap[key] = { tag: "video", quality };
        resultMap[key][type] = href;
      } else if (/\.gif($|\?)/i.test(href) || /gif/i.test(text)) {
        let type = text.toLowerCase().includes('force') ? "force" : "direct";
        // Buat key unik untuk GIF berdasarkan nama file jika bisa
        let gifNamePart = "unknown";
        try { gifNamePart = new URL(href).pathname.split('/').pop().split('?')[0]; } catch {}
        let key = `gif_${gifNamePart}`;
        if (!resultMap[key]) resultMap[key] = { tag: "gif", quality: "standard" };
        resultMap[key][type] = href;
      }
    });
    
    const results = Object.values(resultMap);
    if (!results.length) {
      const errorMessageFromSite = $('.error-message, .alert-danger, div.msg[style*="color:red"]').first().text().trim();
      if (errorMessageFromSite) {
        throw new Error(`pinterestdownloader.com: ${errorMessageFromSite}`);
      }
      throw new Error("Gagal mendapatkan link download. Hasil kosong atau URL tidak didukung.");
    }
    return results;

  } catch (error) {
    console.error("PinterestDL Scraper Full Error:", error.message);
    if (axios.isAxiosError(error) && error.response?.data) {
        const $errorHtml = cheerio.load(error.response.data.toString());
        const siteErrorMessage = $errorHtml('.error-message, .alert-danger, div.msg[style*="color:red"]').first().text().trim();
        if (siteErrorMessage) {
            throw new Error(`pinterestdownloader.com: ${siteErrorMessage}`);
        }
    }
    throw new Error(error.message || "Terjadi kesalahan saat memproses link Pinterest.");
  }
}


// --- Rute Express ---
module.exports = (app) => {
  const creatorName = "ZenzzXD";

  app.get('/downloader/pinterest', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: 'Parameter url (link Pinterest) wajib diisi.'
      });
    }
    // Validasi sederhana untuk URL Pinterest
    if (!/pinterest\.com(\S+)?/.test(url)) {
        return res.status(400).json({
            status: false,
            creator: creatorName,
            message: 'Harap masukkan URL Pinterest yang valid.'
        });
    }

    try {
      const resultData = await fetchPinterestMedia(url);
      res.json({
        status: true,
        creator: creatorName,
        result: resultData
      });
    } catch (error) {
      console.error("Pinterest Downloader Endpoint Error:", error.message, error.stack);
      const statusCode = error.message && (error.message.toLowerCase().includes("tidak ditemukan") || error.message.toLowerCase().includes("tidak valid") || error.message.toLowerCase().includes("gagal mendapatkan link")) ? 404 : 500;
      res.status(statusCode).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Terjadi kesalahan internal saat memproses permintaan Pinterest.'
      });
    }
  });
};
