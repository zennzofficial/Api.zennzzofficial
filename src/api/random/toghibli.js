const axios = require('axios');
const crypto = require('crypto');

module.exports = function (app) {
  app.get('/tools/toghibli', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "url" (URL gambar) wajib diisi.'
      });
    }

    const prompt = "Please convert this image into Studio Ghibli art style with the Ghibli AI generator.";
    const sessionId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();

    const payload = {
      imageUrl: url,
      sessionId,
      prompt,
      timestamp
    };

    try {
      const { data: postData } = await axios.post(
        "https://ghibliai.ai/api/transform-stream",
        payload,
        {
          headers: {
            'content-type': 'application/json'
          }
        }
      );

      const taskId = postData.taskId;
      let retries = 0, maxRetries = 30;

      while (retries < maxRetries) {
        const { data: pollData } = await axios.get(
          `https://ghibliai.ai/api/transform-stream?taskId=${taskId}`,
          {
            headers: {
              'content-type': 'application/json'
            }
          }
        );

        if (pollData.status === 'success') {
          return res.json({
            status: true,
            message: 'Berhasil generate Ghibli image!',
            result: pollData.result,
            creator: 'ZenzzXD'
          });
        }

        if (pollData.status === 'error') {
          return res.status(500).json({
            status: false,
            message: 'Gagal proses image',
            error: pollData.error || pollData
          });
        }

        await new Promise(r => setTimeout(r, 2000));
        retries++;
      }

      return res.status(408).json({
        status: false,
        message: 'Waktu tunggu habis. Silakan coba lagi nanti.'
      });

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: 'Terjadi kesalahan.',
        error: err.response?.data || err.message
      });
    }
  });
};
