const axios = require('axios');

const models = [
  "chatgpt41mini",
  "chatgpt",
  "chatgpto1p",
  "claude",
  "gemini",
  "mistral",
  "grok"
];

async function getCsrfToken() {
  const res = await axios.get('https://app.claila.com/api/v2/getcsrftoken', {
    headers: {
      'authority': 'app.claila.com',
      'accept': '*/*',
      'accept-language': 'ms-MY,ms;q=0.9,en-US;q=0.8,en;q=0.7',
      'origin': 'https://www.claila.com',
      'referer': 'https://www.claila.com/',
      'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36'
    }
  });

  return res.data;
}

async function sendMessageToModel(model, message = 'hai') {
  const csrfToken = await getCsrfToken();

  const res = await axios.post(
    `https://app.claila.com/api/v2/unichat1/${model}`,
    new URLSearchParams({
      'calltype': 'completion',
      'message': message,
      'sessionId': Date.now()
    }),
    {
      headers: {
        'authority': 'app.claila.com',
        'accept': '*/*',
        'accept-language': 'ms-MY,ms;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'origin': 'https://app.claila.com',
        'referer': 'https://app.claila.com/chat?uid=5044b9eb&lang=en',
        'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36',
        'x-csrf-token': csrfToken,
        'x-requested-with': 'XMLHttpRequest'
      }
    }
  );

  return res.data;
}

module.exports = function (app) {
  app.get('/ai/claila', async (req, res) => {
    const model = req.query.model || 'chatgpt';
    const message = req.query.message || 'hai';

    if (!models.includes(model)) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: `Model tidak valid. Pilihan: ${models.join(', ')}`
      });
    }

    try {
      const response = await sendMessageToModel(model, message);
      res.status(200).json({
        status: true,
        creator: 'ZenzzXD',
        model,
        input: message,
        result: response
      });
    } catch (error) {
      console.error('Claila API Error:', error);
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengambil response dari Claila API',
        error: error?.message || String(error)
      });
    }
  });
};
