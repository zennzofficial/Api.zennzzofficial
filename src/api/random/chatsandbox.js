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

      // Pastikan endpoint ini masih valid.
      const apiUrl = 'https://chatsandbox.com/api/chat';

      const response = await axios.post(apiUrl, data, { headers, timeout: 15000 });

      // Pastikan response data valid dan berisi hasil
      if (!response.data || !response.data.result) {
        return res.status(502).json({
          status: false,
          message: 'Response API tidak valid',
          raw: response.data
        });
      }

      res.json({
        status: true,
        creator: 'ZenzzXD',
        result: response.data
      });
    } catch (error) {
      // Lebih detail error response jika tersedia
      let errorMessage = error.message;
      if (error.response) {
        errorMessage = `HTTP ${error.response.status} - ${error.response.statusText}`;
        if (error.response.data) {
          errorMessage += ` | Response: ${JSON.stringify(error.response.data)}`;
        }
      }

      res.status(500).json({
        status: false,
        message: 'Terjadi kesalahan saat memproses permintaan.',
        error: errorMessage
      });
    }
  });
};
