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

    // prompt default yang sudah fix
    const prompt = "Please convert this image into Studio Ghibli art style with the Ghibli AI generator.";
    const sessionId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();

    const payload = { imageUrl: url, sessionId, prompt, timestamp };
    const headers = { 'content-type': 'application/json' };

    try {
      // Start transform, dapat taskId
      const { data: postData } = await axios.post(
        'https://ghibliai.ai/api/transform-stream',
        payload,
        { headers, timeout: 180000 }
      );

      const taskId = postData.taskId;
      let retries = 0;
      const maxRetries = 300; // polling max 10 menit (300 * 2 detik)

      // Polling status tiap 2 detik
      while (retries < maxRetries) {
        const { data: pollData } = await axios.get(
          `https://ghibliai.ai/api/transform-stream?taskId=${taskId}`,
          { headers, timeout: 180000 }
        );

        if (pollData.status === 'success') {
          return res.json({
            status: true,
            message: 'Berhasil mengubah gambar ke style Ghibli!',
            result: pollData,
            creator: 'ZenzzXD'
          });
        }

        if (pollData.status === 'error') {
          return res.status(500).json({
            status: false,
            message: 'Gagal saat proses transformasi',
            error: pollData.error || pollData
          });
        }

        await new Promise(r => setTimeout(r, 2000));
        retries++;
      }

      // Jika timeout
      return res.status(408).json({
        status: false,
        message: 'Timeout: GhibliAI tidak merespons dalam waktu yang diharapkan.'
      });

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: 'Terjadi kesalahan saat proses request ke GhibliAI.',
        error: err.message || err.response?.data
      });
    }
  });
};
