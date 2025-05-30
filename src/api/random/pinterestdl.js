// File: pinterestApi.js (atau nama lain yang Anda inginkan)

const axios = require('axios');
const cheerio = require('cheerio');
const { URLSearchParams } = require('url'); // Built-in di Node.js

const PINTEREST_DOWNLOADER_BASEURL = "https://pinterestdownloader.com/ID";

/**
 * Fungsi inti untuk mengambil media dari Pinterest via pinterestdownloader.com
 * @param {string} pinterestUrl - URL Pinterest (pin, board, atau user).
 * @returns {Promise<Array<object>>} Array berisi objek media yang ditemukan.
 */
async function fetchPinterestMedia(pinterestUrl) {
  try {
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
      "x-requested-with": "XMLHttpRequest"
    };

    const bodyUrl = new URLSearchParams({ url: pinterestUrl }).toString();
    console.log(`PinterestDL: POST URL ${pinterestUrl} ke ${PINTEREST_DOWNLOADER_BASEURL}`);
    const firstPostResponse = await axios.post(PINTEREST_DOWNLOADER_BASEURL, bodyUrl, { 
        headers: commonHeaders, 
        timeout: 20000 
    });
    
    let htmlContent = firstPostResponse.data;
    let $ = cheerio.load(htmlContent);
    let processId = $('input[name="process_id"]').attr('value');
    
    if (!processId) {
        const processIdMatch = htmlContent.match(/process_id["']?\s*:\s*["']([a-f0-9\-]+)["']/i);
        processId = processIdMatch?.[1];
    }

    if (processId) {
      console.log(`PinterestDL: Ditemukan process_id: ${processId}. Memulai polling.`);
      let attempts = 0;
      const MAX_POLL_ATTEMPTS = 5; 
      const POLL_INTERVAL = 3000; 

      for (attempts = 0; attempts < MAX_POLL_ATTEMPTS; attempts++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        console.log(`PinterestDL: Polling attempt ${attempts + 1}/${MAX_POLL_ATTEMPTS}`);
        const pollBody = new URLSearchParams({ process_id: processId }).toString();
        const pollResponse = await axios.post(PINTEREST_DOWNLOADER_BASEURL, pollBody, { 
            headers: commonHeaders, 
            timeout: 7000 // Timeout per poll request lebih pendek
        });
        htmlContent = pollResponse.data;
        $ = cheerio.load(htmlContent); 
        if (!/we are working on|processing your link|กำลังประมวลผลลิงก์ของคุณ/i.test(htmlContent)) {
          console.log("PinterestDL: Polling selesai, konten diterima.");
          break;
        }
      }
      if (attempts >= MAX_POLL_ATTEMPTS && /we are working on|processing your link|กำลังประมวลผลลิงก์ของคุณ/i.test(htmlContent)) {
        throw new Error("Proses di pinterestdownloader.com terlalu lama atau gagal setelah polling maksimal.");
      }
    } else {
      console.log("PinterestDL: Tidak ada process_id, melanjutkan dengan HTML respons pertama.");
    }

    const resultMap = {};

    $('div.results-container a.download__btn, table.table a.button').each((_, el) => {
      const btn = $(el);
      const href = btn.attr('href');
      const text = btn.text().trim();
      if (!href) return;

      let qualityMatch = text.match(/(HD quality|\d+p|\d{3,4}x\d{3,4}|Gambar Kualitas HD)/i);
      let quality = qualityMatch?.[1]?.replace(/Gambar Kualitas /i, '').replace(/ quality/i, '').toUpperCase() || 
                    text.replace(/Unduh Link|Download Link|Download/ig, '').trim().replace(/[\(\)]/g,'') || "standard";
      quality = quality === "" ? "standard" : quality;

      let type = text.toLowerCase().includes('force') ? "force" : "direct";
      let key = `image_${quality.replace(/\s+/g, '_').toLowerCase()}`;
      if (!resultMap[key]) resultMap[key] = { tag: "image", quality };
      resultMap[key][type] = href;
    });

    $('div.buttons a.download_button, div.downloader-section a.download-button, a.download-button').each((_, el) => {
      const btn = $(el);
      const href = btn.attr('href');
      const text = btn.text().trim();
      if (!href) return;

      if (/video|mp4/i.test(text) || (href && href.includes('.mp4'))) {
        let quality = "HD"; 
        const qualityMatch = text.match(/(\d+p|HD|Full HD|Video \w+)/i);
        if (qualityMatch && qualityMatch[1]) quality = qualityMatch[1].replace(/Video /i,'').toUpperCase();
        
        let type = text.toLowerCase().includes('force') ? "force" : "direct";
        let key = `video_${quality.replace(/\s+/g, '_').toLowerCase()}`;
        if (!resultMap[key]) resultMap[key] = { tag: "video", quality };
        resultMap[key][type] = href;
      } else if (/\.gif($|\?)/i.test(href) || /gif/i.test(text)) {
        let type = text.toLowerCase().includes('force') ? "force" : "direct";
        let gifNamePart = "unknown";
        try { gifNamePart = new URL(href).pathname.split('/').pop().split('?')[0].replace(/\.\w+$/, ''); } catch {}
        let key = `gif_${gifNamePart}`;
        if (!resultMap[key]) resultMap[key] = { tag: "gif", quality: "standard" };
        resultMap[key][type] = href;
      } else if (!text.match(/video|mp4|gif/i) && (href.includes('.jpg') || href.includes('.png') || href.includes('.webp'))) {
        let qualityMatch = text.match(/(HD quality|\d+p|\d{3,4}x\d{3,4}|Gambar Kualitas HD)/i);
        let quality = qualityMatch?.[1]?.replace(/Gambar Kualitas /i, '').replace(/ quality/i,'').toUpperCase() || 
                      text.replace(/Unduh Link|Download Link|Download/ig, '').trim().replace(/[\(\)]/g,'') || "image_fallback";
        quality = quality === "" ? "image_fallback" : quality;
        let type = text.toLowerCase().includes('force') ? "force" : "direct";
        let key = `image_${quality.replace(/\s+/g, '_').toLowerCase()}_fb`;
        if (!resultMap[key]) resultMap[key] = { tag: "image", quality };
        resultMap[key][type] = href;
      }
    });
    
    const results = Object.values(resultMap);
    if (!results.length) {
      const errorMessageFromSite = $('.error-message, .alert-danger, div.msg[style*="color:red"]').first().text().trim();
      if (errorMessageFromSite) {
        throw new Error(`pinterestdownloader.com: ${errorMessageFromSite}`);
      }
      throw new Error("Gagal mendapatkan link download. Hasil kosong atau URL tidak didukung oleh pinterestdownloader.com.");
    }
    return results;

  } catch (error) {
    console.error("PinterestDL Scraper Full Error:", error.message);
    if (axios.isAxiosError(error) && error.response?.data) {
        let errorDataString = '';
        // Cek jika error.response.data adalah Buffer (misalnya dari respons non-HTML)
        if (Buffer.isBuffer(error.response.data)) {
            errorDataString = error.response.data.toString('utf-8');
        } else if (typeof error.response.data === 'string') {
            errorDataString = error.response.data;
        } else {
            errorDataString = JSON.stringify(error.response.data);
        }
        
        try {
            const $error = cheerio.load(errorDataString); // Coba parse sebagai HTML
            const siteErrorMessage = $error('.error-message, .alert-danger, div.msg[style*="color:red"]').first().text().trim();
            if (siteErrorMessage) {
                throw new Error(`pinterestdownloader.com: ${siteErrorMessage}`);
            }
        } catch (cheerioError) {
            // Abaikan jika gagal parse sebagai HTML, gunakan pesan error asli
            console.warn("Gagal parse error response sebagai HTML:", cheerioError.message);
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
    
    // Validasi URL Pinterest yang sudah diperbaiki untuk menerima pin.it
    if (!/^(https?:\/\/)?(www\.)?(pinterest\.com|pin\.it)(\S+)?/.test(url)) {
        return res.status(400).json({
            status: false,
            creator: creatorName,
            message: 'Harap masukkan URL Pinterest yang valid (domain pinterest.com atau pin.it).'
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
      const statusCode = error.message && (error.message.toLowerCase().includes("tidak ditemukan") || error.message.toLowerCase().includes("tidak valid") || error.message.toLowerCase().includes("gagal mendapatkan link") || error.message.includes("pinterestdownloader.com:")) ? 404 : 500;
      res.status(statusCode).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Terjadi kesalahan internal saat memproses permintaan Pinterest.'
      });
    }
  });

  // Tambahkan rute lain di sini, misalnya:
  // require('./namaFileApiLain')(app);
};
