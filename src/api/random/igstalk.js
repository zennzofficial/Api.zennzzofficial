const express = require('express');
const axios = require("axios");
const qs = require("qs");

// --- Konstanta dan Fungsi Logika Inti (sebelumnya di instagramStalkerService.js) ---

const CREATOR_NAME = "ZenzzXD"; // Nama kreator Anda

// User-Agent yang lebih umum
const COMMON_USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';
const UPSTREAM_API_URL = 'https://app.mailcamplly.com/api/instagram-profile';
const UPSTREAM_REFERER = 'https://bitchipdigital.com/tools/social-media/instagram-profile-viewer/';
const REQUEST_TIMEOUT = 20000; // Timeout 20 detik

/**
 * Mengambil data profil Instagram dari layanan pihak ketiga.
 * @param {string} username - Username Instagram (tanpa @).
 * @returns {Promise<object>} Data profil atau akan melempar error jika gagal.
 */
async function stalkInstagramProfile(username) {
  if (!username) {
    throw new Error("Username tidak boleh kosong."); // Error ini akan ditangkap oleh route handler
  }

  const requestData = qs.stringify({ url: `@${username.trim()}` });

  const config = {
    method: 'POST',
    url: UPSTREAM_API_URL,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': '*/*',
      'User-Agent': COMMON_USER_AGENT,
      'Referer': UPSTREAM_REFERER
    },
    data: requestData,
    timeout: REQUEST_TIMEOUT
  };

  console.log(`[IGStalk Logic] Mengirim permintaan ke ${UPSTREAM_API_URL} untuk username: @${username}`);

  try {
    const response = await axios(config);

    if (response.status === 200 && response.data) {
      console.log(`[IGStalk Logic] Berhasil mendapatkan data untuk @${username}`);
      return response.data;
    } else {
      console.warn(`[IGStalk Logic] Respons tidak valid dari upstream untuk @${username}: Status ${response.status}`, response.data);
      throw new Error(`Layanan pihak ketiga mengembalikan status ${response.status} atau data tidak valid.`);
    }
  } catch (err) {
    console.error(`[IGStalk Logic] Error saat menghubungi upstream untuk @${username}:`, err.message);
    if (err.response) {
      console.error('[IGStalk Logic] Data error upstream:', err.response.data);
      throw new Error(`Gagal mengambil data dari layanan pihak ketiga (status: ${err.response.status}). Pesan: ${JSON.stringify(err.response.data) || err.message}`);
    } else if (err.request) {
      throw new Error("Tidak ada respons dari layanan pihak ketiga atau terjadi timeout.");
    } else {
      throw new Error(`Terjadi kesalahan pada logika IGStalk: ${err.message}`);
    }
  }
}

// --- Definisi Router Express ---
const router = express.Router();

router.get('/stalker/instagram', async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({
      status: false,
      creator: CREATOR_NAME,
      message: "Parameter 'username' wajib diisi."
    });
  }

  try {
    console.log(`[API /stalker/instagram] Menerima permintaan untuk username: ${username}`);
    const profileData = await stalkInstagramProfile(username);
    
    res.json({
      status: true,
      creator: CREATOR_NAME,
      result: profileData 
    });

  } catch (error) {
    console.error(`[API /stalker/instagram] Error: ${error.message}`);
    let statusCode = 500;
    let message = error.message || "Terjadi kesalahan internal server.";

    if (error.message.includes("pihak ketiga") || error.message.includes("upstream") || error.message.includes("Timeout")) {
        statusCode = 502; // Bad Gateway atau Gateway Timeout
        if (error.message.toLowerCase().includes("timeout")) {
            statusCode = 504; // Gateway Timeout spesifik
        }
    } else if (error.message.includes("Username tidak boleh kosong")) {
        statusCode = 400;
    }

    res.status(statusCode).json({
      status: false,
      creator: CREATOR_NAME,
      message: message
    });
  }
});

// Jika Anda memiliki endpoint stalker lain, bisa ditambahkan di sini
// router.get('/stalker/tiktok', async (req, res) => { ... });

module.exports = router;

// Untuk menguji jika file ini dijalankan langsung (opsional)
/*
if (require.main === module) {
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // Middleware untuk parsing body jika ada endpoint POST/PUT di masa depan
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', router); // Gunakan router dengan prefix /api
  
  app.listen(PORT, () => {
    console.log(`Server uji coba (Stalker API) berjalan di http://localhost:${PORT}`);
    console.log(`Coba endpoint: http://localhost:${PORT}/api/stalker/instagram?username=instagram`);
  });
}
*/
