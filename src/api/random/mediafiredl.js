const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fungsi inti untuk mengambil link download dari MediaFire.
 * @param {string} mediafireUrl - URL halaman MediaFire.
 * @returns {Promise<object>} Objek berisi nama file, mime type, ukuran, dan link download.
 */
async function fetchMediafireLink(mediafireUrl) {
  try {
    const response = await axios.get(mediafireUrl, {
      headers: {
        // MediaFire mungkin sensitif terhadap User-Agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8'
      },
      timeout: 15000 // Timeout 15 detik
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const downloadButton = $('a#downloadButton');
    const link = downloadButton.attr('href');

    if (!link || typeof link !== 'string' || link.trim() === '') {
      // Coba cari pesan error di halaman jika ada
      const anError = $('.notranslate.error').text().trim();
      if (anError) {
          throw new Error(`MediaFire: ${anError}`);
      }
      throw new Error('Link download tidak ditemukan di halaman MediaFire. URL mungkin tidak valid atau struktur halaman berubah.');
    }

    // Ekstrak ukuran file, bersihkan teksnya
    let size = downloadButton.text().trim().replace(/Download/gi, '').replace(/\(|\)/g, '').trim();
    if (!size) { // Fallback jika ukuran tidak ada di tombol
        size = $('.dl-info .file-size').first().text().trim() || 'N/A';
    }


    // Ekstrak nama file dari URL download
    const linkParts = link.split('/');
    const fileName = decodeURIComponent(linkParts[linkParts.length - 1]); // Ambil bagian terakhir dan decode

    // Ekstrak ekstensi file sebagai mime type sederhana
    const nameParts = fileName.split('.');
    const mimeType = nameParts.length > 1 ? nameParts.pop().toLowerCase() : 'unknown';

    return {
      filename: fileName,
      mime: mimeType,
      size: size,
      link: link
    };

  } catch (error) {
    console.error("MediaFire Scraper Error:", error.message);
    if (axios.isAxiosError(error) && error.response) {
      // Jika error dari axios dengan respons (misalnya 404 dari MediaFire)
      throw new Error(`Gagal mengakses URL MediaFire (Status: ${error.response.status}). Cek kembali URL Anda.`);
    }
    // Untuk error lain (termasuk yang dilempar manual di atas)
    throw new Error(error.message || 'Gagal mengambil informasi dari MediaFire.');
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

    // Validasi sederhana URL MediaFire
    if (!url.includes('mediafire.com/file/')) {
        return res.status(400).json({
            status: false,
            creator: creatorName,
            message: 'Harap masukkan URL MediaFire yang valid (contoh: https://ac.insvid.com/widget?url=https://www.youtube.com/watch?v=$3)'
        });
    }


    try {
      const result = await fetchMediafireLink(url);
      res.json({
        status: true,
        creator: creatorName,
        result: result
      });
    } catch (error) {
      console.error("MediaFire Downloader Endpoint Error:", error.message, error.stack);
      // Tentukan status code berdasarkan pesan error jika relevan
      const statusCode = error.message.toLowerCase().includes("tidak ditemukan") || error.message.toLowerCase().includes("tidak valid") ? 404 : 500;
      res.status(statusCode).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Terjadi kesalahan internal saat memproses permintaan MediaFire.'
      });
    }
  });

  // Tambahkan rute lain di sini...
};
