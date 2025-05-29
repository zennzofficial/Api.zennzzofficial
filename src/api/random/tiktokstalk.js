const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fungsi inti untuk mengambil data profil TikTok.
 * Melempar error jika gagal.
 * @param {string} username - Username TikTok.
 * @returns {Promise<object>} Objek userInfo dari TikTok.
 */
async function fetchTikTokUserProfile(username) {
    try {
        const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}`;
        
        // Header yang lebih menyerupai browser
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            // 'Cookie': 'tt_csrf_token=xxxx;' // Mungkin diperlukan jika ada proteksi CSRF yang ketat
        };

        const response = await axios.get(profileUrl, { 
            headers, 
            timeout: 20000 // Timeout 20 detik
        });
        
        const html = response.data;
        const $ = cheerio.load(html);
        const scriptData = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();

        if (!scriptData) {
            // Ini bisa berarti halaman tidak ditemukan atau struktur berubah
            throw new Error('Data pengguna TikTok tidak ditemukan di halaman (script tag __UNIVERSAL_DATA_FOR_REHYDRATION__ hilang). Kemungkinan pengguna tidak ada atau halaman dilindungi.');
        }

        const parsedData = JSON.parse(scriptData);
        
        // Jalur ke data pengguna bisa berubah. Ini adalah tebakan umum.
        // Perlu diverifikasi dengan melihat sumber halaman profil TikTok secara langsung.
        const userDetail = parsedData['__DEFAULT_SCOPE__']?.['webapp.user-detail'];

        if (!userDetail || !userDetail.userInfo || !userDetail.userInfo.user) {
            throw new Error('Informasi detail pengguna tidak ditemukan dalam data JSON. Pengguna mungkin tidak ada.');
        }
        
        // Mengembalikan objek userInfo yang berisi .user dan .stats
        return userDetail.userInfo;

    } catch (error) {
        console.error(`TikTokStalk Error for @${username}:`, error.message);
        // Jika axios mengembalikan error dengan status 404, kemungkinan besar user tidak ada
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            throw new Error(`Pengguna TikTok @${username} tidak ditemukan (404).`);
        }
        // Untuk error lain, lempar pesan aslinya atau pesan yang lebih umum
        throw new Error(error.message || `Gagal mengambil data profil TikTok untuk @${username}.`);
    }
}

// --- Rute Express ---
module.exports = (app) => {
  const creatorName = "ZenzzXD";

  app.get('/stalker/tiktok', async (req, res) => {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: 'Parameter "username" wajib diisi.'
      });
    }

    try {
      const resultData = await fetchTikTokUserProfile(username);
      res.json({
        status: true,
        creator: creatorName,
        result: resultData
      });
    } catch (error) {
      console.error("TikTok Stalker Endpoint Error:", error.message, error.stack);
      // Tentukan status code berdasarkan jenis error jika memungkinkan
      const statusCode = error.message.toLowerCase().includes("tidak ditemukan") ? 404 : 500;
      res.status(statusCode).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Terjadi kesalahan internal saat memproses permintaan.'
      });
    }
  });

  // Tambahkan rute lain di sini...
};
