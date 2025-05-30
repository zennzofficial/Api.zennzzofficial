const axios = require("axios");

const CREATOR_NAME = "ZenzzXD";

async function forwardRemini(imageUrl) { // Mengganti nama parameter agar lebih jelas
  try {
    // Target API upstream (tanpa query parameter di sini)
    const targetBaseUrl = `https://zenzzx-api.vercel.app/tools/remini`;
    // Tambahkan imageUrl sebagai query parameter ke URL target
    const targetUrlWithQuery = `${targetBaseUrl}?url=${encodeURIComponent(imageUrl)}`;

    console.log(`[Remini Forwarder] Calling upstream: ${targetUrlWithQuery}`); // Logging

    // Gunakan axios.get dan URL yang sudah memiliki query parameter
    const response = await axios.get(targetUrlWithQuery, { timeout: 60000 });

    if (response.status !== 200 || !response.data || response.data.status !== true) {
      console.warn("[Remini Forwarder] Invalid response from upstream:", response.data);
      return {
        status: false,
        creator: CREATOR_NAME,
        message: "Gagal mendapatkan respons yang valid dari zenzzx-api.",
        upstream_response: response.data,
        code: response.status || 502 // Gunakan status dari upstream atau 502
      };
    }

    const upscaledImageUrl = response.data.result;

    if (!upscaledImageUrl || typeof upscaledImageUrl !== "string") {
      console.warn("[Remini Forwarder] URL hasil tidak ditemukan atau tidak valid dalam respons upstream:", response.data);
      return {
        status: false,
        creator: CREATOR_NAME,
        message: "URL hasil tidak ditemukan atau tidak valid dalam respons zenzzx-api.",
        upstream_response: response.data,
        code: 502 // Anggap sebagai Bad Gateway jika format data tidak sesuai
      };
    }

    return {
      status: true,
      creator: CREATOR_NAME,
      result: upscaledImageUrl
      // Tidak perlu 'code: 200' di sini karena akan di-handle oleh route handler
    };
  } catch (e) {
    let statusCode = 500;
    let errorMessage = "Terjadi kesalahan internal pada server.";

    if (e.response) { // Error dari respons HTTP upstream
      console.error("[Remini Forwarder] Upstream API error:", e.response.status, e.response.data);
      statusCode = e.response.status; // Gunakan status code asli dari upstream jika < 500
      if (e.response.status >= 500) {
        statusCode = 502; // Bad Gateway jika upstream error 5xx
      }
      errorMessage = e.response.data?.message || `Gagal menghubungi layanan upstream (status: ${e.response.status})`;
    } else if (e.request) { // Request dibuat tapi tidak ada respons (misal, timeout, network error)
      console.error("[Remini Forwarder] No response from upstream or timeout:", e.code, e.message);
      statusCode = 504; // Gateway Timeout
      errorMessage = "Timeout atau tidak ada respons dari layanan upstream.";
    } else { // Error lain saat setup request atau error tak terduga
      console.error("[Remini Forwarder] Generic error:", e.message);
      errorMessage = e.message;
    }

    return {
      status: false,
      creator: CREATOR_NAME,
      message: errorMessage,
      code: statusCode // 'code' ini akan digunakan oleh route handler untuk status HTTP
    };
  }
}

module.exports = function (app) {
  app.get("/tools/remini", async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: CREATOR_NAME,
        message: "Parameter 'url' wajib diisi"
      });
    }

    const result = await forwardRemini(url);
    
    // Tentukan status code HTTP berdasarkan field 'code' dari hasil forwardRemini,
    // atau default ke 200 jika sukses dan tidak ada 'code' (untuk jalur sukses).
    const httpStatusCode = result.code || (result.status === true ? 200 : 500);
    
    // Hapus field 'code' dari objek hasil agar tidak dikirim ke klien jika tidak perlu
    if (result.hasOwnProperty('code')) {
      delete result.code;
    }
    
    res.status(httpStatusCode).json(result);
  });
};
