const axios = require('axios'); // Mengganti node-fetch dengan axios

module.exports = (app) => {
  const creatorName = "ZenzzXD"; // Nama creator Anda

  app.get('/search/tiktok', async (req, res) => {
    const { q } = req.query;

    // Validasi input
    if (!q) {
      return res.status(400).json({
        status: false,
        creator: creatorName, // Ditambahkan
        message: 'Masukkan parameter q (query pencarian TikTok)'
      });
    }

    try {
      const apiUrl = `https://flowfalcon.dpdns.org/search/tiktok?q=${encodeURIComponent(q)}`;
      console.log(`Requesting TikTok search from: ${apiUrl}`); // Logging

      // Menggunakan axios untuk melakukan GET request
      const response = await axios.get(apiUrl, {
        headers: {
            // User-Agent standar, bisa disesuaikan jika API target memerlukan yang spesifik
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
        },
        timeout: 20000 // Timeout 20 detik
      });

      // response.data dari axios sudah dalam bentuk JSON jika content-type sesuai
      const externalData = response.data;

      // Kirim respons sukses
      res.json({
        status: true,
        creator: creatorName, // Ditambahkan
        result: externalData  // Data dari FlowFalcon diletakkan di dalam 'result'
      });

    } catch (err) {
      console.error("FlowFalcon TikTok Search Error:", err.response?.data || err.message); // Logging

      // Coba dapatkan status code dan pesan dari error axios
      const statusCode = err.response?.status || 500;
      // Jika API eksternal memberikan pesan error dalam format JSON, coba gunakan itu
      const message = err.response?.data?.message || err.message || 'Terjadi kesalahan saat mengambil data dari FlowFalcon.';

      // Kirim respons error
      res.status(statusCode).json({
        status: false,
        creator: creatorName, // Ditambahkan
        message: message
      });
    }
  });

  // Tambahkan rute lain di sini...
};
