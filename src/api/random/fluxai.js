const fetch = require('node-fetch');

module.exports = function (app) {
  app.get('/ai/flux', async (req, res) => {
    const { prompt, width = 1600, height = 900, enhance = true } = req.query;

    if (!prompt) {
      return res.status(400).json({
        status: false,
        message: 'Masukkan prompt di query ?prompt=',
        creator: 'ZenzzXD'
      });
    }

    try {
      const fluxUrl = `https://fastrestapis.fasturl.cloud/aiimage/flux/dimension?prompt=${encodeURIComponent(prompt)}&model=flux&width=${width}&height=${height}&enhance=${enhance}`;
      const response = await fetch(fluxUrl);

      if (!response.ok) {
        return res.status(500).json({
          status: false,
          message: 'Gagal mengambil gambar dari server upstream.',
          creator: 'ZenzzXD'
        });
      }

      res.set('Content-Type', response.headers.get('content-type'));
      response.body.pipe(res);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: 'Terjadi kesalahan internal.',
        error: error.message,
        creator: 'ZenzzXD'
      });
    }
  });
};
