const axios = require('axios');
const { atob, btoa } = require('buffer'); // Impor jika diperlukan

// --- Fungsi YTMP3 (dari SaveTube.su) ---
async function fetchYoutubeInfoMp3(youtubeUrl) {
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
  const data = { url: youtubeUrl };

  try {
    const response = await axios.post(apiUrl, data, { headers });
    if (response.data.status === 'error' || !response.data.videoInfo) {
      throw new Error(response.data.message || 'API YTMP3 mengembalikan error.');
    }
    return response.data;
  } catch (error) {
    console.error("SaveTube API Error (MP3):", error.response?.data || error.message);
    throw new Error(`Gagal mengambil info video MP3: ${error.message}`);
  }
}

// --- Fungsi YTMP4 (dari Insvid.com) ---

/**
 * Mengekstrak Video ID dari berbagai format URL YouTube.
 * @param {string} url - URL YouTube.
 * @returns {string|null} Video ID atau null.
 */
function extractVideoId(url) {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null; // Kembalikan null jika tidak ada yang cocok
}

/**
 * Mengambil informasi video MP4 dari Insvid.com.
 * @param {string} youtubeUrl - URL video YouTube.
 * @returns {Promise<object>} Objek data dari API.
 */
async function fetchYoutubeInfoMp4(youtubeUrl) {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) throw new Error('URL YouTube tidak valid atau Video ID tidak ditemukan.');

  const apiUrl = "https://ac.insvid.com/converter";
  const headers = {
    "accept": "*/*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/json",
    "origin": "https://ac.insvid.com",
    "priority": "u=1, i",
    "referer": `https://ac.insvid.com/en10/youtube-to-mp4?url=${encodeURIComponent(youtubeUrl)}`, // Referer yang lebih realistis
    "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
  };
  const data = {
    "id": videoId,
    "fileType": "mp4" // Set ke MP4
  };

  try {
    const response = await axios.post(apiUrl, data, { headers });
     if (response.data.status !== 'ok') { // Insvid biasanya pakai 'ok'
        throw new Error(response.data.message || 'API YTMP4 mengembalikan error.');
    }
    return response.data;
  } catch (error) {
    console.error("Insvid API Error (MP4):", error.response?.data || error.message);
    throw new Error(`Gagal mengambil info video MP4: ${error.message}`);
  }
}

// --- Rute Express ---
module.exports = function (app) {
  const creatorName = "ZenzXD";

  // Handler untuk YTMP3
  app.get('/downloader/ytmp3', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, creator: creatorName, message: "Parameter 'url' wajib diisi." });

    try {
      const result = await fetchYoutubeInfoMp3(url);
      res.json({ status: true, creator: creatorName, result: result });
    } catch (error) {
      res.status(500).json({ status: false, creator: creatorName, message: error.message });
    }
  });

  // Handler untuk YTMP4
  app.get('/downloader/ytmp4', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, creator: creatorName, message: "Parameter 'url' wajib diisi." });

    try {
      const result = await fetchYoutubeInfoMp4(url);
      res.json({ status: true, creator: creatorName, result: result });
    } catch (error) {
      res.status(500).json({ status: false, creator: creatorName, message: error.message });
    }
  });
};
