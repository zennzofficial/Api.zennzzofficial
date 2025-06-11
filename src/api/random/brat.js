const axios = require('axios');

module.exports = function (app) {
  app.get('/maker/brat', async (req, res) => {
    const { text } = req.query;

    if (!text) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter text tidak boleh kosong'
      });
    }

    const encoded = encodeURIComponent(text);

    const sources = [
      `https://api.nekorinn.my.id/maker/brat-v2?text=${encoded}`,
      `https://api.yogik.id/maker/brat?text=${encoded}`
    ];

    for (const url of sources) {
      try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });

        res.set({
          'Content-Type': response.headers['content-type'] || 'image/png',
          'Content-Disposition': 'inline; filename="brat-image.png"'
        });

        return res.send(response.data);
      } catch (err) {
        console.warn(`eror coba lagi nanti`, err.message);
        continue; // coba source selanjutnya
      }
    }

    // Kalau semua gagal
    res.status(500).json({
      status: false,
      creator: 'ZenzzXD',
      message: 'Gagal memproses permintaan brat.',
    });
  });
};
