const axios = require('axios');
const FormData = require('form-data'); // Diperlukan untuk Node.js

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
  return null;
}

/**
 * Kelas Youtubedl yang disesuaikan untuk Node.js/Express
 */
class Youtubedl {
  constructor(url) {
    this.videoId = extractVideoId(url);
    if (!this.videoId) {
      throw new Error('URL YouTube tidak valid atau Video ID tidak ditemukan.');
    }
    this.base = 'https://d.ymcdn.org/api/v3/router';
    this.baseHeaders = { // Header dasar tanpa content-type
      "origin": "https://en.greenconvert.net",
      "referer": "https://en.greenconvert.net/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
    };
    this.server = '';
    this.hash = '';
    this.progressURL = '';
  }

  // Helper untuk POST dengan FormData
  async #_postWithFormData(url, formData) {
    const headers = {
      ...this.baseHeaders,
      ...formData.getHeaders() // Dapatkan header FormData (termasuk boundary)
    };
    const { data } = await axios.post(url, formData, { headers });
    return data;
  }

  // Helper untuk GET
  async #_get(url) {
    const { data } = await axios.get(url, { headers: this.baseHeaders });
    return data;
  }

  // Inisialisasi untuk mendapatkan server, hash, dan progressURL
  async #_initialize() {
    if (this.server && this.hash) return; // Sudah diinisialisasi

    try {
        const routeData = await this.#_get(this.base);
        this.server = routeData.serverUrl;

        const form = new FormData();
        form.append('id', this.videoId);
        const initData = await this.#_postWithFormData(`${this.server}/api/v3/init`, form);

        if (initData.status !== 'ok') throw new Error(initData.message || 'Gagal melakukan init.');
        this.hash = initData.hash;
        this.progressURL = initData.progressURL;
    } catch (e) {
        console.error("Init Error:", e.message);
        throw new Error("Gagal menginisialisasi unduhan: " + e.message);
    }
  }

  // Menunggu hingga video siap diproses
  async #_waitForProgress() {
    await this.#_initialize();
    let progress;
    let attempts = 0;
    while (attempts < 20) { // Coba max 20x (sekitar 1 menit)
      const form = new FormData();
      form.append('id', this.hash);
      form.append('s', false);
      progress = await this.#_postWithFormData(this.progressURL, form);

      if (progress.status === 'error') throw new Error(progress.message || 'Error saat cek progress.');
      if (progress.data?.videoDetail) return progress; // Selesai, kembalikan data

      await new Promise(resolve => setTimeout(resolve, 3000));
      attempts++;
    }
    throw new Error('Timeout menunggu video diproses.');
  }

  // Melakukan konversi dan mendapatkan link detail
  async #_convertAndDetail(itag) {
    await this.#_initialize();

    const convertForm = new FormData();
    convertForm.append('id', this.hash);
    convertForm.append('format', itag);
    convertForm.append('type', 'redirect');
    convertForm.append('s', false);
    const convertData = await this.#_postWithFormData(`${this.server}/api/v3/convert`, convertForm);
    if (convertData.status !== 'ok') throw new Error(convertData.message || 'Gagal convert.');

    const detailForm = new FormData();
    detailForm.append('id', this.hash);
    detailForm.append('format', itag);
    detailForm.append('type', convertData.type);
    detailForm.append('readType', convertData.type);
    detailForm.append('direct', 'direct');
    const detailData = await this.#_postWithFormData(`${this.server}/api/v3/detail`, detailForm);
    if (detailData.status !== 'ok') throw new Error(detailData.message || 'Gagal mendapatkan detail link.');

    return detailData;
  }

  // Metode publik untuk download video 720p
  async downloadVideo720p() {
    const progress = await this.#_waitForProgress();
    const info = progress.data.videoDetail;
    const videoFormat = info.formats.videos['720p'];
    if (!videoFormat) throw new Error('Format video 720p tidak tersedia.');
    const itag = videoFormat.itag;
    const downloadData = await this.#_convertAndDetail(itag);
    return { info, download: downloadData };
  }

  // Metode publik untuk download audio 128k
  async downloadAudio128k() {
    const progress = await this.#_waitForProgress();
    const info = progress.data.videoDetail;
    const audioFormat = info.formats.sounds?.['128k'] || info.formats.audios?.['128k'];
    if (!audioFormat) throw new Error('Format audio 128k tidak tersedia.');
    const itag = audioFormat.itag;
    const downloadData = await this.#_convertAndDetail(itag);
    return { info, download: downloadData };
  }
}

// --- Rute Express ---
module.exports = function (app) {
  const creatorName = "ZenzXD";

  // Handler untuk YTMP3 (Audio 128k)
  app.get('/downloader/ytmp3', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, creator: creatorName, message: "Parameter 'url' wajib diisi." });

    try {
      const dl = new Youtubedl(url);
      const result = await dl.downloadAudio128k();
      res.json({ status: true, creator: creatorName, result: result });
    } catch (error) {
       console.error("YTMP3 Error:", error.message, error.stack);
       res.status(500).json({ status: false, creator: creatorName, message: error.message });
    }
  });

  // Handler untuk YTMP4 (Video 720p)
  app.get('/downloader/ytmp4', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, creator: creatorName, message: "Parameter 'url' wajib diisi." });

    try {
      const dl = new Youtubedl(url);
      const result = await dl.downloadVideo720p();
      res.json({ status: true, creator: creatorName, result: result });
    } catch (error) {
      console.error("YTMP4 Error:", error.message, error.stack);
      res.status(500).json({ status: false, creator: creatorName, message: error.message });
    }
  });
};
