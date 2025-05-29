const axios = require('axios');

module.exports = (app) => {
    const creatorName = "ZenzXD"; // Nama creator Anda

    // Handler umum untuk menembak API Yogik
    const handleYogikDownload = async (req, res, apiEndpoint, formatType) => {
        const { url } = req.query; // Menggunakan 'url'

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: creatorName,
                message: "Parameter 'url' wajib diisi"
            });
        }

        try {
            // Panggil API Yogik sesuai endpoint (MP3 atau MP4)
            const { data } = await axios.get(`${apiEndpoint}?url=${encodeURIComponent(url)}`);

            let resultData = {};
            // Pastikan data ada dan berupa objek, lalu hapus creator Yogik
            if (data && typeof data === 'object') {
                const { creator, ...rest } = data;
                resultData = rest;
            } else {
                resultData = data;
            }

            // Kirim respons sukses
            res.json({
                status: true,
                creator: creatorName, // Creator Anda
                result: resultData    // Data tanpa creator Yogik
            });

        } catch (err) {
            console.error(`Yogik ${formatType} Error:`, err.response?.data || err.message);
            const statusCode = err.response?.status || 500;

            // Kirim respons error
            res.status(statusCode).json({
                status: false,
                creator: creatorName,
                message: err?.response?.data?.message || err.message || `Terjadi kesalahan saat mengambil data ${formatType}.`
            });
        }
    };

    // Rute untuk YTMP3
    app.get('/downloader/ytmp3', (req, res) => {
        handleYogikDownload(req, res, 'https://api.yogik.id/downloader/ytmp3v2', 'YTMP3');
    });

    // Rute untuk YTMP4
    app.get('/downloader/ytmp4', (req, res) => {
        handleYogikDownload(req, res, 'https://api.yogik.id/downloader/ytmp4v2', 'YTMP4');
    });
};
