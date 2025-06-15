const axios = require('axios');

module.exports = function (app) {
  app.get('/tools/ocr', async (req, res) => {
    const { imageUrl } = req.query;

    if (!imageUrl) {
      return res.status(400).json({
        status: false,
        creator: "ZenzzXD",
        message: "Parameter 'imageUrl' wajib diisi"
      });
    }

    try {
      // Menggunakan OCR.space dengan timeout yang lebih pendek
      const response = await axios.get(
        `https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodeURIComponent(imageUrl)}&scale=true`,
        { timeout: 5000 } // Timeout 5 detik
      );

      if (response.data?.ParsedResults?.[0]?.ParsedText) {
        return res.json({
          status: true,
          creator: "ZenzzXD",
          result: {
            text: response.data.ParsedResults[0].ParsedText.trim(),
            confidence: 'High',
            imageUrl: imageUrl,
            processTime: response.data.ProcessingTimeInMilliseconds || 'Fast'
          }
        });
      }

      return res.status(404).json({
        status: false,
        creator: "ZenzzXD",
        message: 'Tidak ada teks yang terdeteksi dalam gambar'
      });

    } catch (error) {
      console.error('OCR Error:', error.message);

      // Menangani timeout dan kesalahan lainnya
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return res.status(500).json({
          status: false,
          creator: "ZenzzXD",
          message: 'Gagal melakukan OCR. Permintaan timeout.',
          error: 'Request timeout'
        });
      }

      return res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: 'Gagal melakukan OCR. Gambar mungkin tidak mengandung teks atau server OCR sedang lambat.',
        error: error.message
      });
    }
  });
};
