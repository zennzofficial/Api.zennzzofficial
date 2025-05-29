const axios = require('axios');

module.exports = (app) => {
    const creatorName = "ZenzXD"; // Pastikan nama creator sesuai

    app.get('/downloader/ytmp3', async (req, res) => {
        // Menggunakan 'url' agar konsisten
        const { url } = req.query; 

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: creatorName, // Ditambahkan
                message: "Parameter 'url' wajib diisi" // Disesuaikan
            });
        }

        try {
            // Menggunakan 'url' dan API Yogik
            const { data } = await axios.get(`https://api.yogik.id/downloader/ytmp3v2?url=${encodeURIComponent(url)}`);
            
            res.json({
                status: true,
                creator: creatorName, // Ditambahkan
                result: data         // Menggunakan 'result'
            });

        } catch (err) {
            console.error("Yogik YTMP3 Error:", err.response?.data || err.message); // Logging
            
            // Menggunakan status error dari API jika ada, atau default 500
            const statusCode = err.response?.status || 500; 

            res.status(statusCode).json({
                status: false,
                creator: creatorName, // Ditambahkan
                message: err?.response?.data?.message || err.message || 'Terjadi kesalahan saat mengambil data YTMP3.'
            });
        }
    });

    // Jika Anda ingin endpoint YTMP4 tetap ada, pastikan kodenya juga ada di sini
    // atau di file lain yang di-require oleh app.js Anda.
    // Kode YTMP4 dari Insvid sebelumnya bisa ditambahkan di sini jika mau.
};
