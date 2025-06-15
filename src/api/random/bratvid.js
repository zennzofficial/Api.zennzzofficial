const axios = require('axios');

module.exports = function (app) {
  app.get('/maker/bratvid', async (req, res) => {
    const { text } = req.query;

    if (!text) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter ?text= tidak boleh kosong'
      });
    }

    const apis = [
      `https://api.nekorinn.my.id/maker/bratvid?text=${encodeURIComponent(text)}`,
      `https://api.yogik.id/maker/bratvid?text=${encodeURIComponent(text)}`
    ];

    for (let i = 0; i < apis.length; i++) {
      try {
        const response = await axios.get(apis[i], {
          responseType: 'stream',
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        });

        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
        return response.data.pipe(res); // langsung kirim file
      } catch (err) {
        if (i === apis.length - 1) {
          return res.status(500).json({
            status: false,
            creator: 'ZenzzXD',
            message: 'eror, segera ss ke owner',
            error: err.message
          });
        }
      }
    }
  });
};
