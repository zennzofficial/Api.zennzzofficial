const axios = require('axios');

module.exports = (app) => { // TYPO DIPERBAIKI: module.exports
  const creatorName = "ZenzzXD";

  app.get('/search/tiktok', async (req, res) => {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: 'Masukkan parameter q (query pencarian TikTok)'
      });
    }

    try {
      const apiUrl = `https://flowfalcon.dpdns.org/search/tiktok?q=${encodeURIComponent(q)}`;
      console.log(`Requesting TikTok search from: ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
        },
        timeout: 20000
      });

      const externalData = response.data;

      if (externalData && externalData.status === true && typeof externalData.result !== 'undefined') {
        // Jika FlowFalcon sukses dan memiliki field 'result'
        res.json({
          status: true,
          creator: creatorName,
          result: externalData.result
        });
      } else if (externalData && externalData.status === false) {
        // Jika FlowFalcon sendiri melaporkan error
        console.warn("FlowFalcon API reported an error:", externalData);
        res.status(400).json({ // Bisa juga 422 Unprocessable Entity atau status lain yang sesuai
          status: false,
          creator: creatorName,
          message: externalData.message || 'API eksternal TikTok Search (FlowFalcon) mengembalikan error.'
        });
      } else {
        // Fallback jika struktur respons FlowFalcon tidak terduga
        console.warn("Struktur respons tidak terduga dari FlowFalcon TikTok Search:", externalData);
        res.status(502).json({ // 502 Bad Gateway: server proxy menerima respons tidak valid
          status: false,
          creator: creatorName,
          message: 'Respons tidak terduga dari API eksternal TikTok.',
          data_received: externalData // Opsional: sertakan data yang diterima untuk debugging
        });
      }

    } catch (err) {
      // Logging error yang lebih detail
      console.error("FlowFalcon TikTok Search Error (axios):", {
          message: err.message,
          stack: err.stack, // Penting untuk debugging di Vercel
          isAxiosError: err.isAxiosError,
          config_url: err.config?.url,
          response_status: err.response?.status,
          response_data: err.response?.data
      });

      const statusCode = err.response?.status || 500;
      let errMessage = 'Terjadi kesalahan saat mengambil data dari FlowFalcon.'; // Default message

      // Coba ambil pesan error yang lebih spesifik
      if (err.response?.data?.message && typeof err.response.data.message === 'string') {
        errMessage = err.response.data.message;
      } else if (err.message && typeof err.message === 'string') {
        errMessage = err.message;
      }

      res.status(statusCode).json({
        status: false,
        creator: creatorName,
        message: errMessage
      });
    }
  });

  // Tambahkan rute lain di sini...
};
