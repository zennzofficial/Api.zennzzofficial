const express = require('express');
const fetch = require('node-fetch'); // Pastikan node-fetch v2 terinstal untuk opsi timeout, atau gunakan AbortController untuk v3+
const router = express.Router();

const CREATOR_NAME = "ZenzXD"; // Sesuaikan dengan nama kreator di API Anda
const FETCH_TIMEOUT = 15000; // Timeout untuk request ke API eksternal dalam milidetik (misal, 15 detik)

router.get('/maker/brat', async (req, res) => {
  try {
    const { text } = req.query;
    if (!text) {
      return res.status(400).json({
        status: false,
        creator: CREATOR_NAME,
        message: 'Parameter "text" wajib diisi.'
      });
    }

    const apiUrl = `https://api.yogik.id/maker/brat?text=${encodeURIComponent(text)}`;
    console.log(`[Brat Maker] Requesting URL: ${apiUrl}`); // Tambahkan log untuk debugging

    const response = await fetch(apiUrl, { timeout: FETCH_TIMEOUT }); // Menambahkan timeout

    if (!response.ok) {
      // Mencoba membaca pesan error dari API eksternal jika ada (opsional)
      let errorBody = null;
      try {
        // Jika API eksternal mengembalikan JSON error, kita bisa coba parse
        if (response.headers.get('content-type')?.includes('application/json')) {
            errorBody = await response.json();
        }
      } catch (parseError) {
        // Abaikan jika body error bukan JSON atau tidak bisa diparse
        console.warn("[Brat Maker] Gagal memparse body error dari API eksternal:", parseError.message);
      }
      
      console.error(`[Brat Maker] Gagal fetch dari API eksternal. Status: ${response.status}, Pesan: ${errorBody ? JSON.stringify(errorBody) : response.statusText}`);
      return res.status(response.status).json({
        status: false,
        creator: CREATOR_NAME,
        message: `Gagal mengambil gambar dari API eksternal. Status: ${response.status}${errorBody && errorBody.message ? `. Pesan: ${errorBody.message}` : ''}`
      });
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
        console.error(`[Brat Maker] Respons dari API eksternal bukan gambar. Content-Type: ${contentType}`);
        return res.status(502).json({ // 502 Bad Gateway, karena upstream service tidak sesuai harapan
            status: false,
            creator: CREATOR_NAME,
            message: 'Respons dari API eksternal bukan gambar yang valid.'
        });
    }
    
    res.set('Content-Type', contentType);
    response.body.pipe(res);

  } catch (err) {
    console.error("[Brat Maker] Error:", err);
    let errorMessage = 'Terjadi kesalahan internal pada server.';
    if (err.type === 'request-timeout') { // Spesifik untuk timeout dari node-fetch
        errorMessage = 'Permintaan ke API eksternal timeout.';
        return res.status(504).json({ // 504 Gateway Timeout
            status: false,
            creator: CREATOR_NAME,
            message: errorMessage
        });
    }
    res.status(500).json({
      status: false,
      creator: CREATOR_NAME,
      message: err.message || errorMessage // Menggunakan pesan error asli jika ada
    });
  }
});

module.exports = router;

