const axios = require('axios');
const crypto = require('crypto');

module.exports = function (app) {
  app.get('/tools/toghibli', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "url" wajib diisi.'
      });
    }

    const prompt = "Please convert this image into Studio Ghibli art style with the Ghibli AI generator.";
    const sessionId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();

    const payload = { imageUrl: url, sessionId, prompt, timestamp };
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; GhibliAI-Client/1.0)'
    };

    try {
      const { data: postData } = await axios.post(
        "https://ghibliai.ai/api/transform-stream",
        payload,
        { headers, timeout: 180000 }
      );

      const taskId = postData.taskId;
      if (!taskId) {
        return res.status(500).json({
          status: false,
          message: 'Tidak dapat memulai tugas transformasi, taskId tidak ditemukan.'
        });
      }

      let retries = 0;
      const maxRetries = 300; // 300 * 2s = 600s = 10 menit

      while (retries < maxRetries) {
        try {
          const { data: pollData } = await axios.get(
            `https://ghibliai.ai/api/transform-stream?taskId=${taskId}`,
            { headers, timeout: 180000 }
          );

          if (pollData.status === 'success') {
            return res.json({
              status: true,
              message: 'Berhasil!',
              result: pollData.result,
              creator: 'ZenzzXD'
            });
          }

          if (pollData.status === 'error') {
            return res.status(500).json({
              status: false,
              message: 'Gagal proses transformasi.',
              error: pollData.error || pollData
            });
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr.message || pollErr);
        }

        await new Promise(r => setTimeout(r, 2000));
        retries++;
      }

      return res.status(408).json({
        status: false,
        message: 'Timeout: GhibliAI tidak merespons dalam waktu 10 menit.'
      });

    } catch (err) {
      console.error('Request error:', err.response?.data || err.message || err);
      return res.status(500).json({
        status: false,
        message: 'Terjadi kesalahan saat proses.',
        error: err.message || err.response?.data
      });
    }
  });
};
