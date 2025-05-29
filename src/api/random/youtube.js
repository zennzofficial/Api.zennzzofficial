const axios = require('axios');

/**
 * Mengambil informasi video (dan link download) dari savetube.su
 * @param {string} youtubeUrl - URL video YouTube.
 * @returns {Promise<object>} Objek data dari API.
 */
async function fetchYoutubeInfo(youtubeUrl) {
  const apiUrl = 'https://cdn304.savetube.su/v2/info';
  const headers = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'content-type': 'application/json',
    'origin': 'https://ytmp3.at',
    'priority': 'u=1, i',
    'referer': 'https://ytmp3.at/',
    'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
  };

  const data = {
    url: youtubeUrl
  };

  try {
    const response = await axios.post(apiUrl, data, { headers });
    if (response.data.status === 'error' || !response.data.videoInfo) {
        throw new Error(response.data.message || 'API eksternal mengembalikan error atau data tidak valid.');
    }
    return response.data;
  } catch (error) {
    console.error("SaveTube API Error:", error.response?.data || error.message);
    throw new Error(`Gagal mengambil info video: ${error.message}`);
  }
}

// --- Rute Express ---
module.exports = function (app) {
  const creatorName = "ZenzXD"; // Menggunakan ZenzXD dari JSON terakhir

  // Handler HANYA untuk YTMP3
  app.get('/downloader/ytmp3', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: "Parameter 'url' wajib diisi."
      });
    }

    if (!/youtu\.?be/.test(url)) {
        return res.status(400).json({
            status: false,
            creator: creatorName,
            message: "Harap masukkan URL YouTube yang valid."
        });
    }

    try {
      const result = await fetchYoutubeInfo(url);
      res.json({
        status: true,
        creator: creatorName,
        result: result // Mengembalikan semua info dari API
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Gagal memproses permintaan YTMP3.'
      });
    }
  });

  // Rute YTMP4 DIHAPUS
};
