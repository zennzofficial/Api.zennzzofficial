const axios = require('axios');
const FormData = require('form-data');

async function upscaler(input) {
  if (!input) throw 'Parameter "image" kosong (url/buffer)';

  let imageBuffer;
  let filename = 'image.jpg';
  let contentType = 'image/jpeg';

  if (typeof input === 'string' && input.startsWith('http')) {
    // Jika input berupa URL gambar
    const response = await axios.get(input, {
      responseType: 'arraybuffer'
    });
    imageBuffer = Buffer.from(response.data);
  } else if (Buffer.isBuffer(input)) {
    // Jika input langsung buffer (misal dari quoted.download())
    imageBuffer = input;
  } else {
    throw 'Format input tidak dikenali';
  }

  const form = new FormData();
  form.append('image', imageBuffer, { filename, contentType });
  form.append('scale', '2');

  const headers = {
    ...form.getHeaders(),
    'accept': 'application/json',
    'origin': 'https://www.pixelcut.ai',
    'referer': 'https://www.pixelcut.ai/',
    'user-agent': 'Mozilla/5.0 (Linux; Android 10)',
    'x-client-version': 'web',
    'x-locale': 'id'
  };

  const { data } = await axios.post('https://api2.pixelcut.app/image/upscale/v1', form, {
    headers
  });

  return data;
}

module.exports = function (app) {
  app.get('/tools/remini', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter ?url= wajib diisi'
      });
    }

    try {
      const result = await upscaler(url);
      res.status(200).json({
        status: true,
        creator: 'ZenzzXD',
        result
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal melakukan upscale gambar',
        error: err?.message || String(err)
      });
    }
  });
};
