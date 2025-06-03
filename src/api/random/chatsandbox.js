const axios = require('axios');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function chatsandbox(prompt, maxRetries = 3, retryDelay = 2000) {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
    'Referer': 'https://chatsandbox.com/chat/openai'
  };

  const data = {
    messages: [prompt],
    character: 'openai'
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await axios.post('https://chatsandbox.com/api/chat', data, {
        headers,
        decompress: true
      });
      return res.data;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        if (attempt === maxRetries) {
          throw new Error('Request gagal karena terlalu banyak permintaan (429). Coba lagi nanti.');
        }
        await delay(retryDelay);
      } else {
        throw error;
      }
    }
  }
}

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
      const result = await chatsandbox(prompt);
      res.json({
        status: true,
        creator: 'ZenzzXD',
        result
      });
    } catch (error) {
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
