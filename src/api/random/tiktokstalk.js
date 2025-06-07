const axios = require('axios');

module.exports = (app) => {
  const creatorName = "ZenzzXD";

  app.get('/stalker/tiktok', async (req, res) => {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: 'Parameter "username" wajib diisi.'
      });
    }

    try {
      const response = await axios.get(`https://arincy.vercel.app/api/ttstalk?username=${encodeURIComponent(username)}`);
      const apiData = response.data;

      if (!apiData || !apiData.status || !apiData.data) {
        throw new Error(apiData.message || 'Gagal mengambil data dari API sumber.');
      }

      // Kirim respons yang sudah disesuaikan
      res.json({
        status: true,
        creator: creatorName, // ubah creator
        result: apiData.data  // ubah key dari "data" jadi "result"
      });

    } catch (error) {
      console.error("Proxy TikTok Error:", error.message);
      const statusCode = error.response?.status || 500;
      res.status(statusCode).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Terjadi kesalahan saat memproses permintaan.'
      });
    }
  });
};
