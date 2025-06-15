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

    // Validasi URL gambar
    if (!/^https?:\/\/.+\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(imageUrl)) {
      return res.status(400).json({
        status: false,
        creator: "ZenzzXD",
        message: "URL gambar tidak valid. Gunakan format: jpg, jpeg, png, gif, bmp, atau webp"
      });
    }

    try {
      const apiKey = 'helloworld'; // API key OCR.space
      const apiUrl = `https://api.ocr.space/parse/imageurl?apikey=${apiKey}&url=${encodeURIComponent(imageUrl)}`;

      const response = await axios.get(apiUrl, {
        timeout: 30000 // Timeout 30 detik
      });

      if (response.data?.ParsedResults?.[0]?.ParsedText) {
        const parsedResult = response.data.ParsedResults[0];
        
        return res.json({
          status: true,
          creator: "ZenzzXD",
          result: {
            text: parsedResult.ParsedText.trim(),
            confidence: parsedResult.TextOverlay?.Message || 'Unknown',
            language: parsedResult.FileParseExitCode === 1 ? 'Detected' : 'Unknown',
            imageUrl: imageUrl,
            processTime: response.data.ProcessingTimeInMilliseconds || 'Unknown'
          }
        });
      }

      return res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: response.data?.ErrorMessage || 'Tidak dapat memproses gambar atau tidak ada teks yang terdeteksi',
        error: response.data
      });

    } catch (error) {
      console.error('OCR Error:', error.message);
      return res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: 'Gagal melakukan OCR pada gambar',
        error: error.response?.data?.ErrorMessage || error.message
      });
    }
  });
};
