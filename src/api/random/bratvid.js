const axios = require('axios');

module.exports = function (app) {
  app.get('/maker/bratvid', async (req, res) => {
    const { text } = req.query;
    if (!text) {
      return res.status(400).json({
        status: false,
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
          responseType: 'stream', // << penting agar tidak buffer binary
        });

        // Set header content-type langsung dari API target
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
        response.data.pipe(res); // Pipe langsung stream ke user
        return;
      } catch (err) {
        // Jika gagal, lanjut ke API berikutnya
        console.log(`Gagal dari: ${url}`);
      }
    }

    // Jika semua API gagal
    res.status(502).json({
      status: false,
      message: 'Gagal mengambil data'
    });
  });
};
