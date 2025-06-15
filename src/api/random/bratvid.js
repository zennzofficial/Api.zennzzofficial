const axios = require('axios');

module.exports = function (app) {
  app.get('/maker/bratvid', async (req, res) => {
    const { text } = req.query;
    if (!text) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: "Parameter 'text' wajib diisi"
      });
    }

    const apiUrls = [
      `https://api.nekorinn.my.id/maker/bratvid?text=${encodeURIComponent(text)}`,
      `https://api.yogik.id/maker/bratvid?text=${encodeURIComponent(text)}`
    ];

    for (const url of apiUrls) {
      try {
        const response = await axios.get(url, {
          responseType: 'stream',
        });

        // Forward content-type sesuai response asli
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
        res.setHeader('Creator', 'ZenzzXD');
        return response.data.pipe(res);
      } catch (err) {
        console.warn(`[BratVid] Gagal mengambil dari ${url}: ${err.message}`);
      }
    }

    // Kalau semua gagal
    res.status(502).json({
      status: false,
      creator: 'ZenzzXD',
      message: 'Gagal mengambil data'
    });
  });
};
