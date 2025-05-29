const axios = require('axios');

module.exports = (app) => {
    const creatorName = "ZenzXD"; // Nama creator Anda

    app.get('/downloader/ytmp3', async (req, res) => {
        const { url } = req.query; 

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: creatorName, 
                message: "Parameter 'url' wajib diisi" 
            });
        }

        try {
            const { data } = await axios.get(`https://api.yogik.id/downloader/ytmp3v2?url=${encodeURIComponent(url)}`);

            // --- PERBAIKAN DI SINI ---
            let resultData = {}; 

            // Pastikan data ada dan berupa objek
            if (data && typeof data === 'object') {
                // Gunakan destructuring: Ambil 'creator' (untuk dibuang)
                // dan sisanya (...rest) masukkan ke resultData.
                const { creator, ...rest } = data; 
                resultData = rest; // resultData sekarang berisi semua KECUALI 'creator'
            } else {
                // Jika data bukan objek, kirim apa adanya (jarang terjadi)
                resultData = data;
            }
            // --- AKHIR PERBAIKAN ---

            res.json({
                status: true,
                creator: creatorName, // Hanya creator Anda
                result: resultData    // Hanya data hasil, tanpa creator Yogik
            });

        } catch (err) {
            console.error("YTMP3 Error:", err.response?.data || err.message); 
            const statusCode = err.response?.status || 500; 

            res.status(statusCode).json({
                status: false,
                creator: creatorName, 
                message: err?.response?.data?.message || err.message || 'Terjadi kesalahan saat mengambil data YTMP3.'
            });
        }
    });

    // Jangan lupa tambahkan kode YTMP4 Anda jika masih ingin digunakan
};
