const axios = require('axios');

module.exports = function (app) {
  app.get('/tools/ocr', async (req, res) => {
    const imageUrl = req.query.url;

    if (!imageUrl) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "url" tidak ditemukan',
        creator: 'ZenzzXD'
      });
    }

    const apiKey = 'helloworld'; // Ganti dengan API key asli kalau punya
    const apiUrl = `https://api.ocr.space/parse/imageurl?apikey=${apiKey}&url=${encodeURIComponent(imageUrl)}`;

    try {
      const response = await axios.get(apiUrl, { timeout: 30000 });
      const parsed = response.data?.ParsedResults?.[0];

      if (parsed?.ParsedText) {
        return res.json({
          status: true,
          creator: 'ZenzzXD',
          result: {
            text: parsed.ParsedText.trim(),
            confidence: parsed.TextOverlay?.Message || 'Unknown',
            language: response.data.FileParseExitCode === 1 ? 'Detected' : 'Unknown'
          }
        });
      }

      return res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: response.data?.ErrorMessage || 'Gagal memproses gambar',
        details: process.env.NODE_ENV === 'development' ? response.data : undefined
      });

    } catch (error) {
      console.error('OCR Error:', error.message);
      return res.status(error.response?.status || 500).json({
        status: false,
        creator: 'ZenzzXD',
        message: error.response?.data?.ErrorMessage || error.message
      });
    }
  });
};
