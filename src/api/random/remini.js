const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const { fileTypeFromBuffer } = require('file-type');

const CREATOR_NAME = "ZenzXD";

function genUsername() {
  return `${crypto.randomBytes(8).toString('hex')}_aiimglarger`;
}

async function upscaleImage(buffer, filename = 'image.jpg', scale = 4, type = 0) {
  const username = genUsername();
  const form = new FormData();

  form.append('type', type);
  form.append('username', username);
  form.append('scaleRadio', scale.toString());
  form.append('file', buffer, { filename, contentType: 'image/jpeg' });

  const uploadRes = await axios.post('https://photoai.imglarger.com/api/PhoAi/Upload', form, {
    headers: {
      ...form.getHeaders(),
      'User-Agent': 'Dart/3.5',
      'Accept-Encoding': 'gzip'
    }
  });

  const code = uploadRes?.data?.data?.code;
  if (!code) throw new Error('Gagal mengunggah gambar');

  const pollData = { code, type, username, scaleRadio: scale.toString() };

  for (let i = 0; i < 1000; i++) {
    const statusRes = await axios.post(
      'https://photoai.imglarger.com/api/PhoAi/CheckStatus',
      JSON.stringify(pollData),
      {
        headers: {
          'User-Agent': 'Dart/3.5',
          'Accept-Encoding': 'gzip',
          'Content-Type': 'application/json'
        }
      }
    );

    const status = statusRes?.data?.data;
    if (status?.status === 'success') {
      const url = status?.downloadUrls?.[0];
      if (!url) throw new Error('URL gambar tidak ditemukan');
      return url;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Upscale gagal setelah polling maksimal');
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

      const downloadRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(downloadRes.data);

      const type = await fileTypeFromBuffer(buffer);
      const ext = type?.ext || 'jpg';

      const upscaledUrl = await upscaleImage(buffer, `upload.${ext}`);

      // Kirim URL hasil dalam JSON, bukan gambar langsung
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
      console.error("[Upscale Error]", e);
      return res.status(500).json({
        status: false,
        creator: CREATOR_NAME,
        message: e.message || "Terjadi kesalahan saat proses upscale."
      });
    }
  });
};
