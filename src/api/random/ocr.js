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

    // Validasi URL gambar (lebih ringan)
    if (!/^https?:\/\/.+\.(jpg|jpeg|png|gif|bmp|webp)/i.test(imageUrl)) {
      return res.status(400).json({
        status: false,
        creator: "ZenzzXD",
        message: "URL gambar tidak valid. Gunakan format: jpg, jpeg, png, gif, bmp, atau webp"
      });
    }

    try {
      // Multi-API approach untuk speed + reliability
      const apis = [
        {
          name: 'ocr.space',
          url: `https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodeURIComponent(imageUrl)}&scale=true&OCREngine=2`,
          timeout: 15000
        },
        {
          name: 'ocr.space-engine1',
          url: `https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodeURIComponent(imageUrl)}&scale=true&OCREngine=1`,
          timeout: 12000
        },
        {
          name: 'api-alternative',
          url: `https://api.api-ninjas.com/v1/imagetotext`,
          timeout: 10000,
          method: 'POST',
          data: { image_url: imageUrl }
        }
      ];

      // Coba API secara parallel (race condition - yang tercepat menang)
      const promises = apis.map(async (api) => {
        try {
          let response;
          
          if (api.method === 'POST') {
            response = await axios.post(api.url, api.data, {
              timeout: api.timeout,
              headers: {
                'X-Api-Key': 'YOUR_API_KEY', // Ganti dengan API key jika ada
                'Content-Type': 'application/json'
              }
            });
          } else {
            response = await axios.get(api.url, {
              timeout: api.timeout
            });
          }

          // Parse response berdasarkan API
          if (api.name.includes('ocr.space')) {
            if (response.data?.ParsedResults?.[0]?.ParsedText) {
              return {
                success: true,
                api: api.name,
                text: response.data.ParsedResults[0].ParsedText.trim(),
                confidence: response.data.ParsedResults[0].TextOverlay?.Message || 'High',
                processTime: response.data.ProcessingTimeInMilliseconds || 'Fast'
              };
            }
          } else if (api.name === 'api-alternative') {
            if (response.data?.text) {
              return {
                success: true,
                api: api.name,
                text: response.data.text.trim(),
                confidence: 'High',
                processTime: 'Fast'
              };
            }
          }

          throw new Error('No text detected');
        } catch (error) {
          throw new Error(`${api.name}: ${error.message}`);
        }
      });

      // Race: ambil yang tercepat
      const result = await Promise.any(promises);

      return res.json({
        status: true,
        creator: "ZenzzXD",
        result: {
          text: result.text,
          confidence: result.confidence,
          language: 'Auto-detected',
          imageUrl: imageUrl,
          processTime: result.processTime,
          apiUsed: result.api
        }
      });

    } catch (error) {
      // Fallback: Coba OCR sederhana dengan timeout sangat pendek
      try {
        const fallbackResponse = await axios.get(
          `https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodeURIComponent(imageUrl)}&scale=true&OCREngine=1&isTable=false`,
          { timeout: 8000 }
        );

        if (fallbackResponse.data?.ParsedResults?.[0]?.ParsedText) {
          return res.json({
            status: true,
            creator: "ZenzzXD",
            result: {
              text: fallbackResponse.data.ParsedResults[0].ParsedText.trim(),
              confidence: 'Medium',
              language: 'Auto-detected',
              imageUrl: imageUrl,
              processTime: 'Fallback',
              apiUsed: 'ocr.space-fallback'
            }
          });
        }
      } catch (fallbackError) {
        console.log('Fallback also failed:', fallbackError.message);
      }

      console.error('All OCR methods failed:', error.message);
      return res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: 'Gagal melakukan OCR. Gambar mungkin tidak mengandung teks atau server OCR sedang lambat.',
        error: 'Timeout atau semua API OCR tidak tersedia'
      });
    }
  });
};
