const axios = require('axios');

module.exports = (app) => {
    const creatorName = "ZenzXD"; // Nama creator Anda

    app.get('/maker/emojimix', async (req, res) => {
        const { emoji1, emoji2 } = req.query; // Mengambil parameter

        // Validasi input
        if (!emoji1 || !emoji2) {
            return res.status(400).json({
                status: false,
                creator: creatorName, // Ditambahkan
                message: 'Parameter emoji1 dan emoji2 wajib diisi'
            });
        }

        try {
            const apiUrl = `https://api.yogik.id/maker/emojimix?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`;
            console.log(`Requesting Emojimix from: ${apiUrl}`); // Logging

            // Panggil API eksternal, minta respons sebagai stream
            const response = await axios.get(apiUrl, {
                responseType: 'stream'
            });

            // Set header 'Content-Type' sesuai dengan respons API eksternal
            res.setHeader('Content-Type', response.headers['content-type']);

            // Alirkan (pipe) data gambar langsung ke respons klien
            response.data.pipe(res);

        } catch (err) {
            console.error("Emojimix Maker Error:", err.response?.data || err.message); // Logging

            // Coba dapatkan status code dan pesan dari error axios
            const statusCode = err.response?.status || 500;
            const message = err.response?.data?.message || err.message || 'Gagal mengambil gambar emojimix';

            // Kirim respons error sebagai JSON
            res.status(statusCode).json({
                status: false,
                creator: creatorName, // Ditambahkan
                message: message
            });
        }
    });

    // Tambahkan rute lain di sini...

};
