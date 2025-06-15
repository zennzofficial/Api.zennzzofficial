const axios = require('axios');

module.exports = function (app) {
  app.get('/maker/image2ghibli', async (req, res) => {
    const image = req.query.image;
    if (!image) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: "Parameter 'image' wajib diisi"
      });
    }

    const url = `https://api.siputzx.my.id/api/image2ghibli?image=${encodeURIComponent(image)}`;

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer', // Menggunakan arraybuffer untuk menghindari timeout
        timeout: 20000 // Set timeout 20 detik
      });

      res.setHeader('Content-Type', response.headers['content-type'] || 'image/webp');
      res.setHeader('Content-Length', response.headers['content-length'] || '');
      res.setHeader('Creator', 'ZenzzXD');

      // Mengirimkan data sebagai buffer
      res.send(Buffer.from(response.data));
    } catch (err) {
      console.error('[image2ghibli] Error:', err.message);
      return res.status(err.response?.status || 502).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengambil data dari sumber',
        error: err.response?.data || err.message
      });
    }
  });
};
