const axios = require('axios');

module.jsorts = (app) => {
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

      // --- PERBAIKAN DI SINI ---
      if (externalData && externalData.status === true && typeof externalData.result !== 'undefined') {
        // Jika FlowFalcon sukses dan memiliki field 'result' (yang berisi array video)
        res.json({
          status: true,
          creator: creatorName,         // Creator Anda
          result: externalData.result   // Ambil HANYA bagian 'result' dari FlowFalcon
        });
      } else if (externalData && externalData.status === false) {
        // Jika FlowFalcon sendiri melaporkan error
        res.status(400).json({ // Atau status lain yang sesuai
          status: false,
          creator: creatorName,
          message: externalData.message || 'API eksternal TikTok Search (FlowFalcon) mengembalikan error.'
        });
      } else {
        // Fallback jika struktur respons FlowFalcon tidak terduga,
        // tapi bukan error dari sisi axios (misalnya, bukan 404 atau 500 dari FlowFalcon)
        console.warn("Struktur respons tidak terduga dari FlowFalcon TikTok Search:", externalData);
        res.json({
          status: true, // Atau false, tergantung bagaimana Anda ingin menangani ini
          creator: creatorName,
          result: externalData // Teruskan seluruh data sebagai fallback
        });
      }
      // --- AKHIR PERBAIKAN ---

    } catch (err) {
      console.error("FlowFalcon TikTok Search Error (axios):", err.response?.data || err.message);

      const statusCode = err.response?.status || 500;
      const message = err.response?.data?.message || err.message || 'Terjadi kesalahan saat mengambil data dari FlowFalcon.';

      res.status(statusCode).json({
        status: false,
        creator: creatorName,
        message: message
      });
    }
  });

  // Tambahkan rute lain di sini...
};
