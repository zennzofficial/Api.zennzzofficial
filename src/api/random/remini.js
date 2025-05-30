const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
// Pastikan Anda menggunakan versi 'file-type' yang kompatibel dengan 'require'
// Jika Anda menggunakan 'file-type' v17+, Anda perlu menggunakan 'import'
// const { fileTypeFromBuffer } = require('file-type'); // Untuk v16 atau sebelumnya
// Untuk file-type v17+ (ESM):
// import('file-type').then(module => {
//   fileTypeFromBuffer = module.fileTypeFromBuffer;
// });
// Atau, jika proyek Anda adalah CommonJS, pastikan instal versi yang sesuai, misal "file-type": "^16.5.4"

// Untuk sementara, kita asumsikan Anda akan menggunakan 'await import' jika versi ESM atau menggunakan versi lama
let fileTypeFromBuffer; // Akan diinisialisasi nanti jika menggunakan dynamic import

const CREATOR_NAME = "ZenzXD";
const MAX_POLL_ATTEMPTS = 120; // Maksimal 120 kali polling (sekitar 1 menit dengan jeda 500ms)
const POLL_INTERVAL = 500; // Jeda antar polling dalam milidetik

function genUsername() {
  return `${crypto.randomBytes(8).toString('hex')}_aiimglarger`;
}

async function upscaleImage(buffer, originalFilename = 'image.jpg', scale = 4, type = 0) {
  if (!fileTypeFromBuffer) { // Inisialisasi fileTypeFromBuffer jika belum
      const module = await import('file-type');
      fileTypeFromBuffer = module.fileTypeFromBuffer;
  }

  const fileMeta = await fileTypeFromBuffer(buffer);
  const mimeType = fileMeta?.mime || 'image/jpeg'; // Default ke image/jpeg jika tidak terdeteksi
  const filename = `upload.${fileMeta?.ext || 'jpg'}`;

  const username = genUsername();
  const form = new FormData();

  form.append('type', type.toString()); // Pastikan type adalah string
  form.append('username', username);
  form.append('scaleRadio', scale.toString());
  form.append('file', buffer, { filename, contentType: mimeType }); // Gunakan mimeType yang terdeteksi

  console.log(`[Upscale] Mengunggah gambar ${filename} dengan tipe ${mimeType} sebagai ${username}`);

  let uploadRes;
  try {
    uploadRes = await axios.post('https://photoai.imglarger.com/api/PhoAi/Upload', form, {
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Dart/3.5', // User-Agent ini mungkin penting bagi API target
        'Accept-Encoding': 'gzip',
        'Connection': 'Keep-Alive', // Beberapa API mungkin memerlukan ini
      },
      timeout: 30000 // Timeout untuk upload 30 detik
    });
  } catch (uploadError) {
    console.error('[Upscale] Error saat mengunggah:', uploadError.message);
    // Coba log respons error jika ada
    if (uploadError.response) {
      console.error('[Upscale] Respons error upload:', uploadError.response.data);
    }
    throw new Error(`Gagal mengunggah gambar ke imglarger: ${uploadError.message}`);
  }


  const code = uploadRes?.data?.data?.code;
  if (!code) {
    console.error('[Upscale] Gagal mendapatkan kode setelah unggah:', uploadRes?.data);
    throw new Error('Gagal mendapatkan kode dari API imglarger setelah unggah. Respons: ' + JSON.stringify(uploadRes?.data));
  }

  console.log(`[Upscale] Gambar terunggah dengan kode: ${code}. Memulai polling status.`);
  const pollData = { code, type: type.toString(), username, scaleRadio: scale.toString() };

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL)); // Jeda sebelum cek status

    let statusRes;
    try {
      statusRes = await axios.post(
        'https://photoai.imglarger.com/api/PhoAi/CheckStatus',
        pollData, // Axios akan otomatis stringify jika Content-Type application/json
        {
          headers: {
            'User-Agent': 'Dart/3.5',
            'Accept-Encoding': 'gzip',
            'Content-Type': 'application/json', // Pastikan Content-Type di sini adalah application/json
            'Connection': 'Keep-Alive',
          },
          timeout: 10000 // Timeout untuk cek status 10 detik
        }
      );
    } catch (statusCheckError) {
      console.warn(`[Upscale] Percobaan polling ${i + 1} gagal: ${statusCheckError.message}`);
      // Jika error karena timeout atau network, lanjutkan polling hingga maksimal
      if (i === MAX_POLL_ATTEMPTS - 1) {
        throw new Error(`Gagal mengecek status upscale setelah beberapa kali percobaan: ${statusCheckError.message}`);
      }
      continue; // Lanjut ke iterasi berikutnya
    }


    const statusData = statusRes?.data?.data;
    console.log(`[Upscale] Status polling ${i + 1}:`, statusData);

    if (statusData?.status === 'success') {
      const url = statusData?.downloadUrls?.[0];
      if (!url) {
        console.error('[Upscale] Sukses tetapi URL download tidak ditemukan:', statusData);
        throw new Error('Proses upscale berhasil tetapi URL gambar tidak ditemukan.');
      }
      console.log(`[Upscale] Sukses! URL Download: ${url}`);
      return url;
    } else if (statusData?.status === 'error' || statusData?.status === 'failed') {
      console.error('[Upscale] Proses upscale gagal di server imglarger:', statusData);
      throw new Error(`Proses upscale gagal di server imglarger. Pesan: ${statusData?.message || 'Tidak ada pesan error spesifik.'}`);
    }
    // Jika status 'processing', 'pending', atau lainnya, biarkan loop berlanjut
  }

  console.error('[Upscale] Gagal setelah polling maksimal.');
  throw new Error('Proses upscale gagal setelah mencapai batas maksimal polling.');
}

module.exports = function (app) {
  app.get('/tools/remini', async (req, res) => {
    try {
      const imageUrl = req.query.url;
      if (!imageUrl) {
        return res.status(400).json({
          status: false,
          creator: CREATOR_NAME,
          message: "Parameter 'url' wajib diisi."
        });
      }

      console.log(`[Remini Endpoint] Memproses URL: ${imageUrl}`);
      const downloadRes = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 20000 // Timeout untuk download gambar input 20 detik
        });

      const buffer = Buffer.from(downloadRes.data);

      // Inisialisasi fileTypeFromBuffer jika belum (penting jika di-load secara dinamis)
      if (!fileTypeFromBuffer) {
          const module = await import('file-type');
          fileTypeFromBuffer = module.fileTypeFromBuffer;
      }
      const typeMeta = await fileTypeFromBuffer(buffer);
      const ext = typeMeta?.ext || 'jpg';

      console.log(`[Remini Endpoint] Gambar diunduh, tipe terdeteksi: ${typeMeta?.mime || 'tidak diketahui'}`);
      const upscaledUrl = await upscaleImage(buffer, `input_image.${ext}`); // Mengirim buffer

      return res.json({
        status: true,
        creator: CREATOR_NAME,
        message: "Berhasil meng-upscale gambar.",
        result: {
          input_url: imageUrl,
          output_url: upscaledUrl
        }
      });

    } catch (e) {
      console.error("[Remini Endpoint Error]", e.message, e.stack); // Log stack trace juga
      // Kirim pesan error yang lebih spesifik dari fungsi upscale jika ada
      const errorMessage = e.message && e.message.startsWith('Gagal') || e.message.startsWith('Proses upscale') ? e.message : "Terjadi kesalahan saat proses upscale.";
      return res.status(500).json({
        status: false,
        creator: CREATOR_NAME,
        message: errorMessage
      });
    }
  });
};
