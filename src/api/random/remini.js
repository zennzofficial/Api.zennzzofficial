const axios = require('axios');

module.exports = (app) => {
    const creatorName = "ZenzzXD"; // Nama creator Anda

    app.get('/tools/remini', async (req, res) => {
        const { url } = req.query; // Menggunakan 'url'

        // Validasi input
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: creatorName, // Ditambahkan
                message: 'Parameter url wajib diisi'
            });
        }

        try {
            const apiUrl = `https://flowfalcon.dpdns.org/imagecreator/remini?url=${encodeURIComponent(url)}`;
            console.log(`Requesting Remini from: ${apiUrl}`); // Logging

            // Panggil API eksternal
            const { data } = await axios.get(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0' // User-Agent standar
                },
                timeout: 60000 // Beri timeout 60 detik untuk jaga-jaga
            });

            // --- PERBAIKAN DI SINI ---
            // Cek jika data ada dan berupa objek
            if (data && typeof data === 'object') {
                // Sebarkan respons asli, LALU timpa/setel creator
                res.json({
                    ...data,           // Mengambil status, result, dll.
                    creator: creatorName // Menimpa creator menjadi ZenzzXD
                });
            } else {
                // Fallback jika data tidak sesuai harapan
                res.json({
                    status: true, // Asumsikan sukses jika data ada tapi bukan objek
                    creator: creatorName,
                    result: data
                });
            }
            // --- AKHIR PERBAIKAN ---

        } catch (err) {
            console.error("FlowFalcon Remini Error:", err.response?.data || err.message); // Logging

            const statusCode = err.response?.status || 500;
            const message = err.response?.data?.message || err.message || 'Gagal memproses gambar dengan remini';

            // Kirim respons error
            res.status(statusCode).json({
                status: false,
                creator: creatorName, // Ditambahkan
                message: message
            });
        }
    });

    // Tambahkan rute lain di sini...

};
