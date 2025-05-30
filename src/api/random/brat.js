const express = require('express');
const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const router = express.Router();

const CREATOR_NAME = "ZenzXD";
const FETCH_TIMEOUT = 15000;

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
    console.log(`[Brat Maker] Requesting URL: ${apiUrl}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      let errorBody = null;
      try {
        if (response.headers.get('content-type')?.includes('application/json')) {
          errorBody = await response.json();
        }
      } catch {}

      console.error(`[Brat Maker] Gagal fetch dari API eksternal. Status: ${response.status}`);
      return res.status(response.status).json({
        status: false,
        creator: CREATOR_NAME,
        message: `Gagal mengambil gambar dari API eksternal. Status: ${response.status}${errorBody?.message ? `. Pesan: ${errorBody.message}` : ''}`
      });
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return res.status(502).json({
        status: false,
        creator: CREATOR_NAME,
        message: 'Respons dari API eksternal bukan gambar yang valid.'
      });
    }

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    response.body.pipe(res).on('error', (err) => {
      console.error("[Brat Maker] Stream error:", err.message);
      res.status(500).json({
        status: false,
        creator: CREATOR_NAME,
        message: 'Gagal mengirim gambar ke klien.'
      });
    });

  } catch (err) {
    console.error("[Brat Maker] Error:", err);
    const isTimeout = err.name === 'AbortError' || err.type === 'request-timeout';
    return res.status(isTimeout ? 504 : 500).json({
      status: false,
      creator: CREATOR_NAME,
      message: isTimeout ? 'Permintaan ke API eksternal timeout.' : err.message || 'Terjadi kesalahan internal.'
    });
  }
});

module.exports = router;
