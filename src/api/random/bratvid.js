const axios = require('axios');

module.exports = function (app) {
  app.get('/maker/bratvid', async (req, res) => {
    const text = req.query.text;
    if (!text) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: "Parameter 'text' wajib diisi"
      });
    }

    const url = `https://api.yogik.id/maker/bratvid?text=${encodeURIComponent(text)}`;

    try {
      const response = await axios.get(url, {
        responseType: 'stream'
      });
      res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
      res.setHeader('Creator', 'ZenzzXD');
      return response.data.pipe(res);
    } catch (err) {
      console.error('[BratVid] Error:', err.message);
      return res.status(502).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengambil data.',
        error: err.message
      });
    }
  });
};
