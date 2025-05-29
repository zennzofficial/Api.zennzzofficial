const axios = require('axios');

module.exports = (app) => {
    const creatorName = "ZenzXD"; // Nama creator Anda

    app.get('/maker/brat', async (req, res) => {
        const { text } = req.query; // Mengambil parameter 'text'

        // Validasi input
        if (!text) {
            return res.status(400).json({
                status: false,
                creator: creatorName, // Ditambahkan
                message: 'Parameter text wajib diisi'
            });
        }

        try {
            const apiUrl = `https://api.yupradev.biz.id/api/image/brat?text=${encodeURIComponent(text)}`;
            console.log(`Requesting Brat image from: ${apiUrl}`); // Logging

            // Panggil API eksternal, minta respons sebagai stream
            const response = await axios.get(apiUrl, {
                responseType: 'stream'
            });

            // Set header 'Content-Type' sesuai dengan respons API eksternal
            res.setHeader('Content-Type', response.headers['content-type']);

            // Alirkan (pipe) data gambar langsung ke respons klien
            response.data.pipe(res);

        } catch (err) {
            console.error("Brat Maker Error:", err.response?.data || err.message); // Logging

            // Coba dapatkan status code dan pesan dari error axios
            const statusCode = err.response?.status || 500;
            const message = err.response?.data?.message || err.message || 'Gagal mengambil gambar brat';

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
