const axios = require('axios');
const cheerio = require('cheerio');
const { lookup } = require('mime-types'); // Dependency baru

/**
 * Fungsi inti untuk mengambil link download MediaFire via rianofc-bypass.
 * @param {string} mediafireOriginalUrl - URL halaman MediaFire asli.
 * @returns {Promise<object>} Objek berisi detail file dan link download.
 */
async function fetchMediafireViaRianofc(mediafireOriginalUrl) {
  try {
    const intermediaryApiUrl = `https://rianofc-bypass.hf.space/scrape?url=${encodeURIComponent(mediafireOriginalUrl)}`;
    console.log(`Requesting MediaFire data via RianOFCH: ${intermediaryApiUrl}`);

    const responseFromIntermediary = await axios.get(intermediaryApiUrl, {
      headers: {
        'User-Agent': 'ZenzzXDApi/1.0 (Bypass Scraper)' // User agent untuk API bypass
      },
      timeout: 25000 // Timeout 25 detik
    });

    const intermediaryJson = responseFromIntermediary.data;

    // Pastikan respons dari API bypass adalah JSON dan memiliki properti 'html'
    if (typeof intermediaryJson !== 'object' || typeof intermediaryJson.html !== 'string') {
      console.error("Respons tidak valid dari rianofc-bypass:", intermediaryJson);
      throw new Error('Respons tidak valid dari API bypass MediaFire (rianofc).');
    }

    const $ = cheerio.load(intermediaryJson.html);

    // Ekstraksi data menggunakan selector Cheerio
    // Selector ini sangat bergantung pada HTML yang dikembalikan oleh rianofc-bypass
    let filename = $('.dl-info').find('.intro .filename').text().trim();
    const type = $('.dl-btn-label').find('.filetype > span').first().text().trim(); // Ambil span pertama untuk tipe umum
    const size = $('.dl-info').find('.details li:contains("File size:") span').text().trim();
    const uploaded = $('.dl-info').find('.details li:contains("Uploaded:") span').text().trim();
    const downloadLink = $('.download_link .input').attr('href'); // Selector yang umum untuk link di wrapper

    if (!downloadLink) {
      throw new Error('Gagal mendapatkan link download dari data yang diproses.');
    }

    // Jika filename kosong (selector gagal), coba ambil dari URL download
    if (!filename && downloadLink) {
        try {
            const urlParts = new URL(downloadLink);
            const pathParts = urlParts.pathname.split('/');
            filename = decodeURIComponent(pathParts[pathParts.length - 1]) || "unknown_file";
        } catch (e) {
            filename = "unknown_file_from_link";
        }
    }


    // Ekstraksi ekstensi dan mimetype
    // Regex asli Anda: /\.(.*?)/ . Karakter '' mungkin spesifik.
    // Kita coba fallback jika regex gagal.
    let ext = 'bin'; // Default extension
    const extElementText = $('.dl-info').find('.filetype > span').eq(1).text(); // Elemen yang mungkin berisi ekstensi
    const regexMatch = /[\(,]?\.(.*?)[,\)]?/i.exec(extElementText); // Regex yang lebih umum: .ext atau (.ext)
    
    if (regexMatch && regexMatch[1]) {
        ext = regexMatch[1].trim().toLowerCase();
    } else if (filename && filename.includes('.')) {
        const parts = filename.split('.');
        if (parts.length > 1) {
            ext = parts.pop().toLowerCase();
        }
    }
    
    const mimetype = lookup(ext) || 'application/octet-stream';


    return {
      filename,
      type: type || ext.toUpperCase(), // Jika type kosong, gunakan ekstensi
      size,
      uploaded_date: uploaded,
      extension: ext,
      mimetype,
      download_link: downloadLink
    };

  } catch (error) {
    console.error("MediaFire Rianofc Scraper Error:", error.response?.data || error.message);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Gagal menghubungi API bypass MediaFire (rianofc): Status ${error.response.status}`);
    }
    // Untuk error parsing atau error dari throw manual
    throw new Error(error.message || 'Gagal memproses link MediaFire via API bypass (rianofc).');
  }
}

// --- Rute Express ---
module.exports = (app) => {
  const creatorName = "ZenzzXD";

  app.get('/downloader/mediafire', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: 'Parameter url (link MediaFire) wajib diisi.'
      });
    }

    if (!/^https?:\/\/(www\.)?mediafire\.com\/file\//.test(url)) { // Validasi URL MediaFire yang lebih spesifik
        return res.status(400).json({
            status: false,
            creator: creatorName,
            message: 'Harap masukkan URL file MediaFire yang valid (contoh: https://ac.insvid.com/widget?url=https://www.youtube.com/watch?v=$3...)'
        });
    }

    try {
      const result = await fetchMediafireViaRianofc(url);
      res.json({
        status: true,
        creator: creatorName,
        result: result
      });
    } catch (error) {
      console.error("MediaFire Downloader Endpoint Error (Rianofc):", error.message, error.stack);
      const statusCode = error.message && (error.message.toLowerCase().includes("tidak ditemukan") || error.message.toLowerCase().includes("tidak valid")) ? 404 : 500;
      res.status(statusCode).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Terjadi kesalahan internal saat memproses permintaan MediaFire.'
      });
    }
  });
};
