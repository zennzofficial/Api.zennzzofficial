/*
 * Fitur By Anomaki Team
 * Created : xyzan code
 * SCRAPE CHATSANDBOX AI
 * Jangan Hapus Wm
 * https://whatsapp.com/channel/0029Vaio4dYC1FuGr5kxfy2l
 */

const axios = require('axios');

module.exports = function (app) {
  app.get('/ai/chatsandbox', async (req, res) => {
    const { prompt } = req.query;

    if (!prompt) {
      return res.status(400).json({
        status: false,
        message: 'Masukkan parameter ?prompt='
      });
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://chatsandbox.com/chat/openai'
      };

      const data = {
        messages: [prompt],
        character: 'openai'
      };

      const response = await axios.post('https://chatsandbox.com/api/chat', data, { headers });

      res.json({
        status: true,
        creator: 'ZenzzXD',
        result: response.data
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: 'Terjadi kesalahan saat memproses permintaan.',
        error: error.message
      });
    }
  });
};
