const axios = require('axios');

module.exports = function (app) {
  app.get('/tools/genius', async (req, res) => {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter "query" tidak ditemukan'
      });
    }

    try {
      const response = await axios.get('https://fastrestapis.fasturl.cloud/music/songlyrics-v2', {
        params: { name: query }
      });

      const data = response.data;

      res.status(200).json({
        ...data,
        creator: 'ZenzzXD'
      });

    } catch (error) {
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Terjadi kesalahan saat mengambil lirik',
        error: error.response?.data || error.message
      });
    }
  });
};
