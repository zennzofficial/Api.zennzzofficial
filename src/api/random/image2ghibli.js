const axios = require('axios');

module.exports = function (app) {
  app.get('/maker/image2ghibli', async (req, res) => {
    const image = req.query.image;
    if (!image) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: "Parameter 'url' wajib diisi"
      });
    }

    const url = `https://api.siputzx.my.id/api/image2ghibli?image=${encodeURIComponent(image)}`;

    try {
      const response = await axios.get(url, {
        responseType: 'stream'
      });

      res.setHeader('Content-Type', response.headers['content-type'] || 'image/webp');
      res.setHeader('Content-Length', response.headers['content-length'] || '');
      res.setHeader('Creator', 'ZenzzXD');

      response.data.pipe(res);
    } catch (err) {
      console.error('[image2ghibli] Error:', err.message);
      return res.status(502).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengambil data',
        error: err.message
      });
    }
  });
};
